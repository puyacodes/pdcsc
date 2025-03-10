#!/usr/bin/env node
'use strict';

var semver = require('semver');
var child_process = require('child_process');
var _enum = require('@locustjs/enum');
var fs = require('fs');
var path$1 = require('path');
var exception = require('@locustjs/exception');
var simpleGit = require('simple-git');
var base = require('@locustjs/base');
var readline = require('readline');
var chalk = require('chalk');
var ts = require('@puya/ts');
var detectEncoding = require('detect-file-encoding-and-language');
var iconv = require('iconv-lite');
var moment = require('jalali-moment');
var sql = require('mssql');
var logging = require('@locustjs/logging');
var extensionsObject = require('@locustjs/extensions-object');

var name = "@puya/pdcsc";
var version = "2.0.0";

function checkForUpdate(config) {
    try {
        const currentVersion = version;
        const latest = child_process.execSync(`npm view ${name} version`, { encoding: "utf8" }).trim();

        if (semver.gt(latest, currentVersion)) {
            console.warn(`⚠️  Update available for ${name}: ${currentVersion} → ${latest}`);
            console.log(`Run "npm update ${name}" to update.`);
        } else {
            config.debug(`✅  ${name} is up-to-date! (version: ${currentVersion})`);
        }
    } catch (err) {
        console.error(`Failed to check for updates: ${err}`);
    }
}

const ActionType = _enum.Enum.define({
    createOrUpdateChangeset: 0,
    runOnPipline: 1,
    runAllChangesets: 2,
    getVersion: 3,
    init: 4,
    initfull: 5,
    updateTimestamp: 6
}, 'ActionType');

const UpdateMode = _enum.Enum.define({
    TestAndUpdate: 0,
    Test: 1,
    Update: 2
}, 'UpdateMode');

class FileHelper {
    static deleteFile(filepath) {
        if (fs.existsSync(filepath)) {
            fs.unlinkSync(filepath);
        }
    }
    static deleteFiles(...filepaths) {
        for (let filepath of filepaths) {
            FileHelper.deleteFile(filepath);
        }
    }
    static createFile(basePath, fileName, content, log = false) {
        const filePath = path$1.join(basePath, fileName);

        if (!fs.existsSync(filePath)) {
            fs.writeFileSync(filePath, content, "utf8");

            if (log) {
                console.log(`Created file: ${fileName}`);
            }
        }

        return filepath;
    }
    static createDir(basePath, folder, log = false) {
        const folderPath = path$1.join(basePath, folder);

        if (!fs.existsSync(folderPath)) {
            fs.mkdirSync(folderPath, { recursive: true });

            if (log) {
                console.log(`Created folder: ${folder}`);
            }
        }
    }
}

class ExecuteQueryException extends exception.Exception {
    constructor(query, ...args) {
        super(...args);

        this.query = query;
    }
}

function createErrorLog(config, ex) {
    const { paths } = config;
    const { changesetsPath } = paths;
    const { query } = ex;
    let error;

    if (ex instanceof ExecuteQueryException) {
        ex.query = null;
    }

    const logFile = path$1.join(changesetsPath, "error.log");

    error = new exception.Exception(`Error during script execution. see '${logFile}' for more details.`, ex);

    try {
        fs.writeFileSync(logFile, "", "utf-8");

        try {
            fs.appendFileSync(logFile, JSON.stringify(ex, null, 4) + "\n\n", "utf-8");
        } catch (e) {
            let msg = e.message || e;

            fs.appendFileSync(logFile, msg + "\n\n", "utf-8");

            msg = ex.message || ex;

            fs.appendFileSync(logFile, msg + "\n\n", "utf-8");
        }

        if (query) {
            fs.appendFileSync(logFile, query + "\n\n", "utf-8");
        }
    } catch (ex) {
        console.error(`Error creating log file`, ex);
    }

    return error;
}

async function backupMasterDatabase(config) {
    const { database, db, paths } = config;
    const { backupFile } = paths;
    const dbName = database.database;

    console.log("Creating database backup...");

    await db.executeQuery({
        query: `BACKUP DATABASE [${dbName}] TO DISK = '${backupFile}' WITH INIT`
    });

    config.debug(`Database backup created at: ${backupFile}`);
}

async function dropTempDb(config) {
    const { db, backupDbName } = config;
    let error;

    try {
        await db.executeQuery({
            query: `IF EXISTS(SELECT name FROM sys.databases WHERE name = '${backupDbName}')
            DROP DATABASE[${backupDbName}]`
        });
    } catch (ex) {
        const msg = config.debugMode ? `Dropping temporary database ${backupDbName} failed.` : `Dropping temporary database failed.`;

        error = new exception.Exception(msg, ex);
    }

    if (!error) {
        if (config.debugMode) {
            console.log(`Temporary database ${backupDbName} dropped successfully.`);
        } else {
            console.log(`Temporary database dropped successfully.`);
        }
    }

    return error;
}

async function executeScript(config, script) {
    const { db, backupDbName } = config;

    console.log("Executing script on temporary database...");

    await db.executeBatch({ content: script, dbName: backupDbName });

    console.log(`Script executed successfully on temp database.`);
}

async function getFileGroups(config) {
    try {
        const query = `
            SELECT
                db.name AS dbName,
                type_desc AS fileType,
                Physical_Name AS location,
                mf.Name AS name
            FROM
                sys.master_files mf
            INNER JOIN 
                sys.databases db ON db.database_id = mf.database_id
            WHERE db.name = '${config.database.database}'
        `;
        const result = await config.db.executeQuery({ query });

        return result;
    } catch (ex) {
        throw new exception.Exception(`Error fetching database file Groups`, ex);
    }
}

async function generateRestoreCommand(config) {
    const { backupDbName } = config;

    try {
        const fileGroups = await getFileGroups(config);
        const moveClauses = fileGroups.map(file => {
            const newFileName = `${config.paths.backupDir}${backupDbName}_${file.location.split("\\").pop()}`;
            
            return `MOVE '${file.name}' TO '${newFileName}'`;
        });

        const moveString = moveClauses.join(", ");

        const restoreCommand = `
use master;

RESTORE DATABASE [${backupDbName}] FROM DISK='${config.paths.backupFile}' WITH File = 1, ${moveString};`;

        return restoreCommand;
    } catch (ex) {
        throw new exception.Exception(`Error generating restore command`, ex);
    }
}

async function restoreTempDatabase(config) {
    const { db, backupDbName } = config;

    console.log("Restoring backup to temporary database...");

    const restoreCommand = await generateRestoreCommand(config);

    await db.executeQuery({ query: restoreCommand });

    config.debug(`Backup restored as: ${backupDbName}`);
}

async function testScript(config, script) {
    let error;

    try {
        await backupMasterDatabase(config);
        await restoreTempDatabase(config);
        await executeScript(config, script);
    } catch (ex) {
        error = createErrorLog(config, ex);
    } finally {
        error = await dropTempDb(config);
    }

    return error;
}

async function commitChanges(files, message) {
    let error;
    const git = simpleGit();
    
    try {
        for (const file of files) {
            await git.add(file);
        }
    
        await git.commit(message);
    } catch (ex) {
        error = ex;
    }

    return error;
}

async function testAndCommitChangeset(config) {
    const { paths } = config;
    const {
        scriptFilePath,
        scriptTempFilePath,
        changesetFilePath,
        changesetTempFilePath
    } = config;
    const tempScriptContent = fs.readFileSync(scriptTempFilePath, "utf-8");

    let error = await testScript(config, tempScriptContent);

    if (!error) {
        try {
            error = await commitChanges([changesetFilePath, scriptFilePath], `pdcsc: changeset ${config.changeset} ${config.isNewChangeset ? "created" : "updated"}.`);

            config.changesetCommitted = true;

            if (!error) {
                fs.renameSync(scriptTempFilePath, scriptFilePath);
                fs.renameSync(changesetTempFilePath, changesetFilePath);

                console.log(`Script saved at: ${scriptFilePath}`);
            }
        } catch (ex) {
            error = new exception.Exception('error happened while renaming changeset files.', ex);
        }
    }

    FileHelper.deleteFiles(scriptTempFilePath, changesetTempFilePath, paths.backupFile);

    return error;
}

function validateChangeSetFile(config) {
    const tempSections = {
        customStart: "",
        procedures: [],
        functions: [],
        tables: [],
        relations: [],
        types: [],
        views: [],
        indexes: [],
        triggers: [],
        schemas: [],
        customEnd: ""
    };
    const content = fs.readFileSync(config.changesetFilePath, "utf-8");

    const sections = [
        { name: "customStart", start: "## ===================== Custom-Start (start) ======================", end: "## ===================== Custom-Start ( end ) ======================" },
        { name: "customEnd", start: "## ===================== Custom-End (start) ======================", end: "## ===================== Custom-End ( end ) ======================" },
        { name: "schemas", start: "## ===================== Schemas (start) ======================", end: "## ===================== Schemas ( end ) ======================" },
        { name: "types", start: "## ===================== Types (start) ======================", end: "## ===================== Types ( end ) ======================" },
        { name: "tables", start: "## ===================== Tables (start) ======================", end: "## ===================== Tables ( end ) ======================" },
        { name: "relations", start: "## ===================== Relations (start) ======================", end: "## ===================== Relations ( end ) ======================" },
        { name: "functions", start: "## ===================== Functions (start) ======================", end: "## ===================== Functions ( end ) ======================" },
        { name: "procedures", start: "## ===================== SPROCs (start) ======================", end: "## ===================== SPROCs ( end ) ======================" },
        { name: "views", start: "## ===================== Views (start) ======================", end: "## ===================== Views ( end ) ======================" },
        { name: "indexes", start: "## ===================== Indexes (start) ======================", end: "## ===================== Indexes ( end ) ======================" },
        { name: "triggers", start: "## ===================== Triggers (start) ======================", end: "## ===================== Triggers ( end ) ======================" }
    ];

    sections.forEach(section => {
        // Check if the section exists
        if (!content.includes(section.start) || !content.includes(section.end)) {
            throw new exception.Exception(`Error: Section '${section.name}' was not found in changeset.`);
        }

        // Extract current section content
        let innerContent = content
            .split(section.start)[1]
            .split(section.end)[0]
            .trim();

        if (innerContent.length > 0) {
            if (section.name != "customStart" && section.name != "customEnd") {
                const lines = innerContent.split("\n");

                lines.forEach(line => {
                    const trimmedLine = line.trim();

                    if (!tempSections[section.name].includes(trimmedLine)) {
                        tempSections[section.name].push(trimmedLine);
                    }
                });
            } else {
                tempSections[section.name] = innerContent;
            }
        }
    });

    // QUESTION: why we should write back content to changeset?
    //           content is not changed!
    // Write the updated content back to the file
    fs.writeFileSync(config.changesetFilePath, content, "utf-8");

    return tempSections;
}

function finalizeChangeset(config, sections, dropStatements) {
    const content = `
## ===================== Custom-Start (start) ======================
${sections.customStart}${dropStatements}
## ===================== Custom-Start ( end ) ======================

## ===================== Schemas (start) ======================
${sections.schemas.join("\n")}
## ===================== Schemas ( end ) ======================

## ===================== Types (start) ======================
${sections.types.join("\n")}
## ===================== Types ( end ) ======================

## ===================== Tables (start) ======================
${sections.tables.join("\n")}
## ===================== Tables ( end ) ======================

## ===================== Relations (start) ======================
${sections.relations.join("\n")}
## ===================== Relations ( end ) ======================

## ===================== Functions (start) ======================
${sections.functions.join("\n")}
## ===================== Functions ( end ) ======================

## ===================== SPROCs (start) ======================
${sections.procedures.join("\n")}
## ===================== SPROCs ( end ) ======================

## ===================== Views (start) ======================
${sections.views.join("\n")}
## ===================== Views ( end ) ======================

## ===================== Indexes (start) ======================
${sections.indexes.join("\n")}
## ===================== Indexes ( end ) ======================

## ===================== Triggers (start) ======================
${sections.triggers.join("\n")}
## ===================== Triggers ( end ) ======================

## ===================== Custom-End (start) ======================
${sections.customEnd}
## ===================== Custom-End ( end ) ======================
`;
    fs.writeFileSync(config.changesetTempFilePath, content, "utf-8");

    console.log(`Changeset written to ${config.changesetTempFilePath}`);
}

function getDropScripts(deletedFiles, folders) {
    const folderToObjectMap = {
        [folders.procedures]: "PROCEDURE",
        [folders.functions]: "FUNCTION",
        [folders.tables]: "TABLE",
        [folders.relations]: "FOREIGN KEY",
        [folders.types]: "TYPE",
        [folders.views]: "VIEW",
        [folders.indexes]: "INDEX",
        [folders.triggers]: "TRIGGER",
        [folders.schemas]: "SCHEMA"
    };

    const generateDropQuery = (objectType, objectName) => {
        switch (objectType) {
            case "PROCEDURE":
            case "FUNCTION":
                return `
IF OBJECT_ID(N'${objectName}', N'${objectType[0]}') IS NOT NULL
DROP ${objectType} ${objectName};
GO
`;

            case "TABLE":
                return `
/*Note: Drop Table
IF OBJECT_ID(N'${objectName}', N'U') IS NOT NULL
DROP TABLE ${objectName};
GO
*/`;

            case "FOREIGN KEY":
                return `
/*Note: Drop the FOREIGN KEY from its table
ALTER TABLE table_name DROP CONSTRAINT ${objectName};
GO
*/`;

            case "TYPE":
                return `
IF EXISTS (SELECT 1 FROM sys.types WHERE name = '${objectName}')
DROP TYPE ${objectName};
GO
`;

            case "VIEW":
                return `
IF OBJECT_ID(N'${objectName}', N'V') IS NOT NULL
DROP VIEW ${objectName};
GO
`;

            case "INDEX":
                return `
/*Note: Drop the index from its table
DROP INDEX ${objectName} ON table_name;
GO
*/`;

            case "TRIGGER":
                return `
IF OBJECT_ID(N'${objectName}', N'TR') IS NOT NULL
DROP TRIGGER ${objectName};
GO
`;

            case "SCHEMA":
                return `
IF EXISTS (SELECT 1 FROM sys.schemas WHERE name = '${objectName}')
DROP SCHEMA ${objectName};
GO
`;

            default:
                return null;
        }
    };

    const dropQuery = deletedFiles
        .map(file => {
            const parts = file.split('/');
            const folderName = parts[1]; // exp: 07-Procedures
            const objectName = parts.slice(parts.length - 1).join('.').replace('.sql', ''); // exp: dbo.sp01
            const objectType = folderToObjectMap[folderName];

            if (!objectType) {
                console.warn(`Warning: sql deleted file ignored ${file} (unknown type).`);
                
                return null;
            }

            // Generate the appropriate DROP query
            return generateDropQuery(objectType, objectName);
        })
        .filter(query => query) // Remove null values
        .join('\n'); // Combine queries

    return dropQuery;
}

function promptUser(question, toLower = true) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            rl.close();
            
            const result = toLower ? answer.trim().toLowerCase(): answer.trim();
            
            resolve(result);
        });
    });
}

async function filterChanges(config, changes) {
    const folders = Object.values(config.folders);
    const result = changes.filter(file => {
        const isInScriptsFolder = folders.some(folder => file.startsWith(`${config.paths.scriptsFolderName}/${folder}`));
        const isSqlFile = file.endsWith(".sql");

        return isInScriptsFolder && isSqlFile;
    });

    return result;
}

async function getUncommittedSqlChanges(config, exclude) {
    const git = simpleGit();
    const changes = await git.status();
    const statuses = ['not_added', 'conflicted', 'created', 'deleted', 'ignored', 'modified', 'renamed'];
    const result = {};
    const all = [];

    statuses.filter(state => state != exclude)
        .forEach(state => {
            if (Array.isArray(changes[state])) {
                result[state] = filterChanges(config, changes[state]);

                all.push(...result[state]);
            }
        });

    result.all = all;

    config.debug("Uncommited .sql files", result);

    return result;
}

async function getUserChoice(config) {
    let error;
    let userChoice = ".";
    let generateDrops = false;

    const changes = await getUncommittedSqlChanges(config);

    if (changes.all.length > 0) {
        do {
            console.warn("\nWarning: You have uncommitted changes.");

            userChoice = await promptUser(
                `\nChoose an option:
    1. Ignore
    2. Commit
    3. Show
    4. Cancel
    Enter your choice: `);

            if (userChoice === "1") {
                break;
            } else if (userChoice === "2") {
                console.log("Committing changes...");

                error = await commitChanges(changes.all, "pdcsc: commited current changes");
                break;
            } else if (userChoice === "3") {
                const files = [];

                if (changes.modified.length > 0) {
                    files.push(chalk.blue("Modified files:"));
                    files.push(...changes.modified);
                }
                if (changes.not_added.length > 0) {
                    files.push(chalk.green("Untracked files:"));
                    files.push(...changes.not_added);
                }
                if (changes.deleted.length > 0) {
                    files.push(chalk.red("Deleted files:"));
                    files.push(...changes.deleted);
                }

                if (files.length) {
                    console.log("Uncommitted changes:\n");
                    console.log(files.join("\n"));
                } else {
                    console.log("No uncommitted changes found!");
                }
            } else if (userChoice === "4") {
                console.log("Operation cancelled by the user.");
                userChoice = "";
                break;
            } else {
                console.log("Invalid choice.");
            }
        } while (true);
    }

    if (base.isSomeArray(changes.deleted)) {
        const answer = await promptUser(`\nGenerate DROP statement(s) for deleted object(s)? `);

        generateDrops = answer == "y";
    }

    if (error) {
        throw new exception.Exception("committing changes failed", error);
    }
    
    return { userChoice, changes, generateDrops };
}

function extractDateFromString(inputString) {
    try {
        let date;
        const regex = /^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})?/;
        const match = inputString.match(regex);

        if (match) {
            const year = parseInt(match[1], 10);
            const month = parseInt(match[2], 10);
            const day = parseInt(match[3], 10);
            const hour = parseInt(match[4], 10);
            const minute = parseInt(match[5], 10);
            const second = match[6] ? parseInt(match[6], 10) : 0;

            date = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
            
            const formattedDate = date.toISOString().replace('T', ' ').replace(/\.\d{3}Z/, '');

            return formattedDate;
        } else {
            throw new Error("No date found in the input string.");
        }
    } catch (ex) {
        throw new exception.Exception(ex);
    }
}

async function checkChangesetExistence(config) {
    let changeset;
    let changesetExists = false;
    let exit = false;
    const { currentBranch } = config;
    const { changesetsPath } = config.paths;
    const fileNames = fs.readdirSync(changesetsPath);
    const regex = new RegExp(`^\\d+_${currentBranch}\\.txt$`);

    for (const fileName of fileNames) {
        if (regex.test(fileName)) {
            changesetExists = true;
            changeset = fileName;
            const existingDate = extractDateFromString(fileName);

            console.warn(`Changeset file already exists: ${changeset}`);

            if (fileNames.filter(file => file.endsWith(".sql")).some(x => extractDateFromString(x) > existingDate)) {
                do {
                    console.warn("The changeset is followed by other changesets.");

                    const userChoice = await promptUser("Modifying old changesets is not recommended. continue (y/n)? ");

                    if (userChoice === "y") {
                        break;
                    } else if (userChoice === "n") {
                        exit = true;
                        console.log("Operation canceled.");
                        break;
                    } else {
                        console.log("Invalid choice. Please enter a valid option.");
                    }
                } while (true)
            }

            break;
        }
    }

    return { changeset, changesetExists, exit };
}

function createNewChangeset(config) {
    try {
        const { now, currentBranch } = config;
        const content = `
## ===================== Custom-Start (start) ======================
## ===================== Custom-Start ( end ) ======================

## ===================== Schemas (start) ======================
## ===================== Schemas ( end ) ======================

## ===================== Types (start) ======================
## ===================== Types ( end ) ======================

## ===================== Tables (start) ======================
## ===================== Tables ( end ) ======================

## ===================== Relations (start) ======================
## ===================== Relations ( end ) ======================

## ===================== Functions (start) ======================
## ===================== Functions ( end ) ======================

## ===================== SPROCs (start) ======================
## ===================== SPROCs ( end ) ======================

## ===================== Views (start) ======================
## ===================== Views ( end ) ======================

## ===================== Indexes (start) ======================
## ===================== Indexes ( end ) ======================

## ===================== Triggers (start) ======================
## ===================== Triggers ( end ) ======================

## ===================== Custom-End (start) ======================
## ===================== Custom-End ( end ) ======================
`;

        const { changesetsPath } = config.paths;

        config.changeset = `${now}_${currentBranch}.txt`;
        config.changesetFilePath = path$1.join(changesetsPath, config.changeset);

        fs.writeFileSync(config.changesetFilePath, content);

        console.log(`New empty changeset ${config.changeset} created.`);
    } catch (ex) {
        throw new exception.Exception(`generating new changeset ${config.changeset} failed`, ex);
    }
}

async function getOrCreateChangeset(config) {
    let result = true;
    let changesetExists = false;
    let { changesetsPath } = config.paths;

    if (!config.changeset) {
        const cce = await checkChangesetExistence(config);

        changesetExists = cce.changesetExists;

        if (!cce.exit) {
            if (changesetExists) {
                config.changeset = cce.changeset;
                config.changesetFilePath = path$1.join(changesetsPath, config.changeset);
            } else {
                createNewChangeset(config);
            }
        } else {
            result = false;
        }
    } else {
        changesetExists = true;
    }

    const cleanFilename = path$1.parse(config.changeset).name;

    config.changesetTemp = `${cleanFilename}~.txt`;
    config.changesetTempFilePath = path$1.join(changesetsPath, config.changesetTemp);
    config.scriptFilePath = path$1.join(changesetsPath, `${cleanFilename}.sql`);
    config.scriptTempFilePath = path$1.join(changesetsPath, `${cleanFilename}~.sql`);

    config.isNewChangeset = !changesetExists;

    return result;
}

function isValidScriptFile(config, file) {
    if (!file.startsWith(config.paths.scriptsFolderName)) {
        return false
    }

    if (!file.toLowerCase().endsWith('.sql')) {
        return false;
    }

    const segments = file.split('/');

    if (!segments.length) {
        return false;
    }

    if (segments.length < 2) {
        return false;
    }
    
    const subdir = segments[1].toLowerCase();

    const validFolders = Object.values(config.folders).map(folder => folder.toLowerCase());

    if (!validFolders.some(folder => subdir.startsWith(folder))) {
        console.warn(`Warning: sql changed file ${file} ignored (unknown type).`);

        return false;
    }

    return true;
}

function getChangedFiles(config) {
    const { currentBranch, masterBranchName } = config;

    try {
        const mergeBase = child_process.execSync(
            `git merge-base HEAD ${masterBranchName}`,
            { encoding: "utf-8" }
        ).trim();

        config.debug(`Current Branch: ${currentBranch}, Master Branch: ${masterBranchName}`);
        config.debug(`Merge Base: ${mergeBase}`);

        const modifiedAndAddedFiles = child_process.execSync(
            `git diff --name-only --diff-filter=MA ${mergeBase} HEAD`,
            { encoding: "utf-8" }
        )
            .split("\n")
            .map((file) => file.trim())
            .filter((file) => file);

        const renamedFiles = child_process.execSync(
            `git diff --name-only --diff-filter=R ${mergeBase} HEAD`,
            { encoding: "utf-8" }
        )
            .split("\n")
            .map((file) => file.trim())
            .filter((file) => file);

        const deletedFiles = child_process.execSync(
            `git diff --name-only --diff-filter=D ${mergeBase} HEAD`,
            { encoding: "utf-8" }
        )
            .split("\n")
            .map((file) => file.trim())
            .filter((file) => file);

        const allFiles = [...modifiedAndAddedFiles, ...renamedFiles];
        const finalFiles = allFiles.filter((file) => isValidScriptFile(config, file));

        config.debug("Final .sql files:", finalFiles);

        return finalFiles;
    } catch (ex) {
        throw new exception.Exception(`Error fetching modified and untracked files`, ex);
    }
}

function restoreCommittedChanges(num) {
    const command = `git reset --mixed HEAD~${num ?? 1}`;

    try {
        child_process.execSync(
            command,
            { encoding: "utf-8" }
        ).trim();

        console.log("All commited changes are restored.");
    } catch (error) {
        throw new exception.Exception("ERROR!! RESTORING COMMITTED CHANGES FAILED.\nYOU MUST RESTORE CHANGES MANUALLY.\n\n" + command, error)
    }
}

async function compareWithDevBranch(config) {
    let result = true;
    const { masterBranchName, realBranchName } = config;
    const git = simpleGit();

    if (masterBranchName) {
        try {
            do {
                git.checkIsRepo((err, isRepo) => {
                    if (err || !isRepo) {
                        console.log('This is not a git repository.');
                        result = false;
                    };
                });

                if (!result) {
                    break;
                }

                console.log("Fetching latest updates from origin ...");

                const [origin, branch] = masterBranchName.split("/");

                await git.fetch(origin, branch);

                const branches = await git.branch(['-r']);

                if (!branches.all.includes(masterBranchName)) {
                    throw new exception.Exception(`Remote branch ${masterBranchName} does not exist.`);
                }

                const base = await git.raw(['merge-base', realBranchName, masterBranchName]);
                const log = await git.log({ from: base.trim(), to: masterBranchName });

                if (log.total > 0) {
                    console.log(`Your '${realBranchName}' branch is behind ${masterBranchName} by ${log.total} commits.`);
                    console.log(`Please run "git pull ${masterBranchName}" to sync with the latest changes.`);
                    
                    result = false;
                }
            } while (false);
        } catch (ex) {
            throw new exception.Exception(`Error checking ${masterBranchName} branch:`, ex);
        }
    } else {
        console.log(`no master branch is specified.`);
    }

    return result;
}

function getAppVersion(config) {
    const appVersionSporcTemplate = base.isSomeString(config.appVersionSprocTemplate) ?
                    config.appVersionSprocTemplate:
                    `create or alter proc ${config.appVersionSprocName} as select '{ts}'`;
    const res = ts.Timestamper({
        locale: `${config.timestampLocale}`,
        template: `${appVersionSporcTemplate}`,
        format: `${config.appVersionFormat}`,
        skipOutput: true
    });

    if (!res.success) {
        throw new exception.Exception(`ts not generated successfully.`, res.err);
    }
    
    return res.data;
}

async function getEncoding(filepath) {
    const info = await detectEncoding(filepath);
    let result = (info.encoding || "").toLowerCase().replace("-", "");

    if (result == "utf8") {
        result = "utf-8";
    }
    if (!result) {
        result = "latin1";
    }
    if (["utf-8", "utf16le", "ascii", "latin1"].indexOf(result) < 0) {
        throw new exception.Exception(`unsupported encoding ${result} (${info.encoding}) in ${filepath}`);
    }

    return result;
}
async function readFile(filepath, codepage) {
    const encoding = await getEncoding(filepath);

    let content = fs.readFileSync(filepath, encoding);

    if (encoding == "latin1" && codepage) {
        const bytes = fs.readFileSync(filepath, "binary");

        content = iconv.decode(bytes, codepage);
    }

    return content;
}
function getAllSqlFiles(dir) {
    let result = [];
    const list = fs.readdirSync(dir);

    list.forEach((file) => {
        const fullPath = path$1.join(dir, file);
        const stat = fs.statSync(fullPath);

        if (stat && stat.isDirectory()) {
            result = result.concat(getAllSqlFiles(fullPath));
        } else if (fullPath.toLowerCase().endsWith(".sql")) {
            result.push(fullPath);
        }
    });

    return result;
}
function extractObjects(config) {
    const objects = [];
    let currentSection = "";
    let customStart = "";
    let customEnd = "";

    const lines = fs.readFileSync(config.changesetTempFilePath, "utf-8").split("\n");

    for (const line of lines) {
        const trimmed = line.trim();

        if (trimmed.startsWith("##")) {
            if (trimmed.containsAny("Procedure", "Sproc")) currentSection = "procedures";
            else if (trimmed.containsAny("Function", "udf")) currentSection = "functions";
            else if (trimmed.contains("Table")) currentSection = "tables";
            else if (trimmed.contains("Type")) currentSection = "types";
            else if (trimmed.contains("Index")) currentSection = "indexes";
            else if (trimmed.contains("Trigger")) currentSection = "triggers";
            else if (trimmed.contains("Relation")) currentSection = "relations";
            else if (trimmed.contains("View")) currentSection = "views";
            else if (trimmed.contains("Schema")) currentSection = "schemas";
            else if (trimmed.contains("Custom-Start")) currentSection = "customStart";
            else if (trimmed.contains("Custom-End")) currentSection = "customEnd";
        } else if (currentSection === "customStart") {
            customStart += `\n${trimmed}`;
        } else if (currentSection === "customEnd") {
            customEnd += `\n${trimmed}`;
        } else if (trimmed && !trimmed.startsWith("##")) {
            if (currentSection) {
                objects.push({ type: currentSection, name: trimmed });
            } else {
                console.warn("\tOrphan line ignored: " + trimmed);
            }
        }
    }

    config.debug(`Total objects: ${objects.length}\n`);

    return { objects, customStart, customEnd };
}

async function processChangeset(config) {
    const sb = {
        schemas: [],
        procedures: [],
        functions: [],
        tables: [],
        relations: [],
        indexes: [],
        types: [],
        views: [],
        triggers: []
    };

    const { objects, customStart, customEnd } = extractObjects(config);
    const files = getAllSqlFiles(config.paths.scriptsPath);

    for (const obj of objects) {
        let found = false;

        for (const filePath of files) {
            const fileName = path$1.basename(filePath);

            if (base.isNullOrEmpty(config.folders[obj.type])) {
                throw new exception.Exception(`missing script folder for ${obj.type}`)
            }

            // TODO: Done
            // Filepath must be checked - Relation and Table conflict here (same names)
            if (filePath.contains(config.folders[obj.type]) && fileName.contains(obj.name)) {
                // TODO: Done
                // read files based on their encoding
                const content = await readFile(filePath, config.defaultCodePage);

                sb[obj.type].push(content);

                found = true;

                config.debug(`${obj.type}: ${obj.name} copied.`);

                break;
            }
        }

        // TODO: Done
        // check object's file existence and throw error if not found
        if (!found) {
            throw new exception.Exception(`${config.folders[obj.type]}: ${obj.name} file not found!`);
        }
    }

    return `-- ***               Changeset ${config.changeset}             ***
-- ===================== Custom-Start (start) ======================
${customStart}
-- ===================== Custom-Start ( end ) ======================

-- ===================== Schemas (start) ======================
${sb.schemas.join("\n")}
-- ===================== Schemas (end) ======================

-- ===================== Types (start) ======================
${sb.types.join("\n")}
-- ===================== Types (end) ======================

-- ===================== Tables (start) ======================
${sb.tables.join("\n")}
-- ===================== Tables (end) ======================

-- ===================== Relations (start) ======================
${sb.relations.join("\n")}
-- ===================== Relations (end) ======================

-- ===================== Functions (start) ======================
${sb.functions.join("\n")}
-- ===================== Functions (end) ======================

-- ===================== Procedures (start) ======================
${sb.procedures.join("\n")}
-- ===================== Procedures (end) ======================

-- ===================== Custom-End (start) ======================
${customEnd}
-- ===================== Custom-End ( end ) ======================
`;
}

async function saveFinalScript(config) {
    const { scriptTempFilePath } = config;
    const script = await processChangeset(config) + `
go
${getAppVersion(config)}
go
`;

    fs.writeFileSync(scriptTempFilePath, script, "utf-8");

    config.debug(`Script written to: ${scriptTempFilePath}`);
}

function updateSections(config, sections, allChanges) {
    const { folders } = config;

    allChanges.forEach((file) => {
        let fileName = path$1.basename(file);

        // QUESTION: why we should omit dbo. prefix.
        //           this can lead to bugs.
        if (fileName.toLowerCase().startsWith("dbo.")) {
            fileName = fileName.substring(4);
        }

        for (const [section, folder] of Object.entries(folders)) {
            if (file.includes(`${config.paths.scriptsFolderName}/${folder}/`)) {
                if (!sections[section].includes(fileName)) {
                    sections[section].push(fileName);
                }
            }
        }
    });

    return sections;
}

function checkIfBranchAlreadyMerged(config) {
    let error;
    const { realBranchName, masterBranchName } = config;

    try {
        const result = child_process.execSync(
            `git merge-base --is-ancestor ${realBranchName} ${masterBranchName} && echo "merged" || echo "not merged"`,
            { encoding: "utf-8" }
        );

        if (result.trim() == "merged") {
            error = new exception.Exception(`branch ${realBranchName} already merged into ${masterBranchName}.
Changing merged branches is forbidden.
Create a new branch from ${realBranchName} if you have any new changes.`);
        }
    } catch (ex) {
        error = new exception.Exception("error happened while checking whether branch is already merged or not", ex);
    }

    return error;
}

async function createChangeset(config) {
    let error;

    if (await compareWithDevBranch(config)) {
        
        // TODO: Done
        // if current branch already merged with origin, exit.
        // we should not allow changing previous branches.
        // we show a message that user should create a new branch
        // if he intends to change previous branches.
        error = checkIfBranchAlreadyMerged(config);

        if (!error) {
            let userChoice;

            try {
                const guc = await getUserChoice(config);

                userChoice = guc.userChoice;

                if (userChoice) {
                    if (await getOrCreateChangeset(config)) {
                        const sections = validateChangeSetFile(config);
                        const allChanges = getChangedFiles(config);

                        updateSections(config, sections, allChanges);

                        const drops = guc.generateDrops ? getDropScripts(guc.changes.deleted, config.folders) : "";

                        finalizeChangeset(sections, drops);

                        await saveFinalScript(config);

                        error = await testAndCommitChangeset(config);
                    }
                }
            } catch (ex) {
                error = ex;
            }

            if (error && config.isNewChangeset) {
                FileHelper.deleteFile(config.changesetFilePath);
            }

            if (error && userChoice === "2") {
                restoreCommittedChanges(config.changesetCommitted ? 2 : 1);
            }
        }
    }

    return error;
}

async function initGitRepo(git) {
    let error;

    do {
        const choice = await promptUser("Would you like to initialize a git repository(Y/N)? ");

        if (choice === "y") {
            try {
                await git.init();

                console.log("Git repository initialized successfully.");
            } catch (ex) {
                error = ex;
                console.log("Initializing git repository failed");
            }

            break;
        } else if (choice === "n") {
            break;
        } else {
            console.log("Invalid choice. Please enter a valid option.");
        }
    } while (true);

    return error;
}

function gitignoreContent() {
    return `# SQL Server files
*.mdf
*.ldf
*.ndf

# User-specific files
*.rsuser
*.suo
*.user
*.userosscache
*.sln.docstates

# User-specific files (MonoDevelop/Xamarin Studio)
*.userprefs

# Visual Studio cache files
.vs/

# Node.js
node_modules/

# Dist and publish
/dist
/publish

# Microsoft Azure
csx/
*.build.csdef

# Logs and backups
/Changes/error.log`;
}

function pdcscConfigContent(config) {
    const configContent = {
        database: {
            server: "127.0.0.1",
            user: "sa",
            password: "****",
            database: "mydb"
        }
    };

    if (config.action == ActionType.initfull) {
        configContent.pipeline = "gitlabs";
        configContent.masterBranchName = "origin/main",
        configContent.appVersionSprocName = "dbo.getAppVersion";
        configContent.appVersionFormat = "YYYY-MM-DD HH:mm:ss",
        configContent.timestampLocale = "en";
        configContent.changesetsTableName = "Changesets";
        configContent.backupDbName = "TempBackupDB";
        configContent.defaultCodePage = "";
        configContent.paths = {
            backupDir: "C:\\temp\\",
            changesetFolderName: "Changes",
            scriptsFolderName: "Scripts",
        };
        configContent.folders = {
            Procedures: "Procedures",
            Functions: "Functions",
            Tables: "Tables",
            Relations: "Relations",
            Types: "Types",
            Views: "Views",
            Indexes: "Indexes",
            Triggers: "Triggers",
            Schemas: "Schemas"
        };
    }
    
    return JSON.stringify(configContent, null, 4);
}

function gitlabCiContent() {
    return `stages:
  - build

variables:
  GIT_DEPTH: 0

before_merge_build:
  stage: build
  image: node:alpine
  script:
    - echo "Installing dependencies..."
    - apk update && apk add git
    - npm i @puya/pdcsc -g
    - |
      if [ "$CI_MERGE_REQUEST_SOURCE_BRANCH_NAME" = "dev" ] || [ "$CI_MERGE_REQUEST_SOURCE_BRANCH_NAME" = "main" ]; then
        pdcsc -ud -dbm -c "pdcsc-config.$\{CI_MERGE_REQUEST_TARGET_BRANCH_NAME\}.json"
      else
        pdcsc -rop -dbm -c "pdcsc-config.$\{CI_MERGE_REQUEST_TARGET_BRANCH_NAME\}.json"
      fi
  rules:
    - when: manual`;
}

async function initProject(config) {
    let error;

    const { basePath } = config;

    do {
        try {
            const git = simpleGit();

            let hasGitRepo = await git.checkIsRepo();

            if (!hasGitRepo) {
                error = await initGitRepo(git);

                if (error) {
                    break;
                }

                hasGitRepo = true;
            }

            const folders = [
                "Changes",
                "Data",
                "Scripts/Schemas",
                "Scripts/Types",
                "Scripts/Tables",
                "Scripts/Functions",
                "Scripts/Triggers",
                "Scripts/Views",
                "Scripts/Procedures",
                "Scripts/Relations",
                "Scripts/Indexes"
            ];

            folders.forEach(folder => FileHelper.createDir(basePath, folder, true));

            const gitlabCI = FileHelper.createFile(basePath, ".gitlab-ci.yml", gitlabCiContent(), true);
            const pdcscConfig = FileHelper.createFile(basePath, "pdcsc-config.json", pdcscConfigContent(config), true);
            const gitIgnore = FileHelper.createFile(basePath, ".gitignore", gitignoreContent(), true);

            error = await commitChanges([gitlabCI, pdcscConfig, gitIgnore], "pdcsc: initialized files and folders.");
        } catch (ex) { error = ex; }
    } while (false);

    return error;
}

async function ensureChangesTableCreated(config) {
    const { db, changesetsTableName } = config;

    await db.executeQuery({
        query: `IF OBJECT_ID('${changesetsTableName}', 'U') IS NULL
                    CREATE TABLE ${changesetsTableName}
                    (
                        [Id] INT IDENTITY(1,1) PRIMARY KEY,
                        [Name] NVARCHAR(255) NOT NULL,
                        [Date] DATETIME NOT NULL DEFAULT(GETDATE())
                    );`
    });
}

async function addChangesetToDatabase(config, changeset) {
    const { db, changesetsTableName } = config;

    try {
        const query = `INSERT INTO ${changesetsTableName} ([name]) VALUES ('${changeset.name}')`;

        await db.executeQuery({ query });

        console.log(`changeset ${changeset.name} added`);
    } catch (ex) {
        throw new exception.Exception(`Error adding changeset ${changeset.name} to database`, ex);
    }
}

async function runAndAddChangeset(config, changeset) {
    const { db } = config;
    let error;

    try {
        console.log(`   executing changeset ${changeset.name} ...`);
        
        const content = fs.readFileSync(changeset.path, "utf-8");
        
        await db.executeBatch({ content });
        
        console.log(`   succeeded.`);
        console.log(`   adding changeset to database ...`);

        await addChangesetToDatabase(config, changeset);
    } catch (ex) {
        error = ex;

        createErrorLog(config, ex);
    }

    return error;
}

async function testPendingChangesets(config, pendingChangesets) {
    let error;

    try {
        const scripts = [];

        for (let changeset of pendingChangesets) {
            const content = fs.readFileSync(changeset.path, "utf-8");

            scripts.push(content);
        }

        error = await testScript(config, scripts.join("\ngo\n"));
    } catch (ex) {
        error = new exception.Exception("Bundling changesets failed", ex);
    }

    return error;
}

async function getLastExecutedChangeset(config) {
    const { db, changesetsTableName } = config;

    let result;

    try {
        const rs = await db.executeQuery({
            query: `SELECT TOP 1 [date], [name] FROM ${changesetsTableName} ORDER BY [date] DESC`
        });

        result = rs && rs.length ? rs[0] : null;
    } catch (ex) {
        throw new exception.Exception(`cannot fetch last executed changeset`, ex);
    }

    return result;
}

function getPendingChangesets(config, lastExecutedChangeset) {
    const changesets = fs.readdirSync(config.paths.changesetsPath);
    const sqlFiles = changesets
        .filter(changeset => path$1.extname(changeset) == ".sql")
        .map(filepath => ({
            name: path$1.parse(filepath).name,
            path: path$1.join(config.paths.changesetsPath, filepath)
        }));
    const lastExecutedChangesetName = lastExecutedChangeset?.name;
    const lastExecutedDate = lastExecutedChangesetName ? extractDateFromString(lastExecutedChangesetName) : null;
    let pendingChangesets = [];

    for (const file of sqlFiles) {
        const match = file.name.match(/(\d{12,14})/);

        if (!match) {
            continue;
        }

        let fileDateStr = match[1]; //example: 140311131345
        let fileDate = extractDateFromString(fileDateStr);

        if (!lastExecutedDate || fileDate > lastExecutedDate) {
            if (!file.name.includes("update")) {
                pendingChangesets.push({ ...file, date: fileDate });
            }
        }
    }

    config.debug("pending Changesets", pendingChangesets.map(changeset => changeset.name));

    pendingChangesets.sort((a, b) => a.date - b.date);

    if (pendingChangesets.length === 0) {
        console.log("No new changesets found. Database is up-to-date.");
    }

    return pendingChangesets;
}

async function run$1(config) {
    let error;
    const { updateMode } = config;

    // TODO: Done
    // exec mode
    //  test
    //  test & update   * default
    //  update

    try {
        await ensureChangesTableCreated(config);

        const lastExecutedChangeset = await getLastExecutedChangeset(config);
        const pendingChangesets = getPendingChangesets(config, lastExecutedChangeset);

        if (pendingChangesets.length) {
            if (updateMode == UpdateMode.TestAndUpdate || updateMode == UpdateMode.Test) {
                error = await testPendingChangesets(config, pendingChangesets);
            }

            if (!error) {
                // TODO: Done
                // run changeset one by one instead of merging them together and create a large script and run that.

                if (updateMode == UpdateMode.TestAndUpdate || updateMode == UpdateMode.Update) {
                    for (let changeset of pendingChangesets) {
                        error = await runAndAddChangeset(config, changeset);

                        if (error) {
                            break;
                        }
                    }
                }
            }
        }
    } catch (ex) {
        error = new exception.Exception('updating database failed', ex);
    }

    return error;
}

function getChangesetContent(config) {
    let content;
    const { currentBranch, realBranchName } = config;
    const { changesetsPath } = config.paths;
    const changesetFiles = fs.readdirSync(changesetsPath);
    const changeset = changesetFiles.find(file => file.includes(currentBranch) && file.endsWith(".sql"));

    if (changeset) {
        console.log(`Found changeset: ${changeset}`);

        const changesetPath = path$1.join(changesetsPath, changeset);

        content = fs.readFileSync(changesetPath, "utf-8");
    } else {
        console.warn(`No changeset file found for branch '${realBranchName}'`);
    }

    return content;
}

async function executeChangeset(config, changeset) {
    let error;
    const { db } = config;
    const { database } = config.database;

    try {
        console.log(`Executing changeset on ${database} database...`);

        await db.executeBatch({ content: changeset });

        console.log(`Script executed successfully on database: ${database}`);
    } catch (ex) {
        error = new exception.Exception(`executing changeset on ${database} failed`, ex);
    }

    return error;
}

async function run(config) {
    let error;
    const content = getChangesetContent(config);

    if (content) {
        let error = await testScript(config, content);

        if (!error) {
            error = await executeChangeset(config, content);
        }
    }

    return error;
}

function getCurrentBranch(config) {
    let currentBranch;
    let realBranchName;

    if (config.action == ActionType.runOnPipline) {
        if (config.pipeline === "gitlabs") {
            if (process.env.CI_COMMIT_REF_NAME) {
                currentBranch = process.env.CI_COMMIT_REF_NAME.trim().replace("/", "-");
            }
            realBranchName = process.env.CI_COMMIT_REF_NAME;
        } else if (config.pipeline === "azuredevops") {
            if (process.env.CI_COMMIT_REF_NAME) {
                currentBranch = process.env.CI_COMMIT_REF_NAME.trim().replace("/", "-");
            }
            realBranchName = process.env.CI_COMMIT_REF_NAME;
        }
    } else {
        currentBranch = child_process.execSync("git rev-parse --abbrev-ref HEAD", { encoding: "utf-8" }).trim().replace("/", "-");
        realBranchName = child_process.execSync("git rev-parse --abbrev-ref HEAD", { encoding: "utf-8" }).trim();
    }

    return { currentBranch, realBranchName }
}

class DbHelperBase {
    constructor(config) {
        exception.throwIfInstantiateAbstract(DbHelperBase, this);

        this.config = Object.assign({}, config);
    }
    executeQuery({ query, dbName, noCatch = true }) {
        exception.throwNotImplementedException(`${this.constructor.name}.executeQuery`, this);
    }
    async executeBatch({ content }) {
        exception.throwNotImplementedException(`${this.constructor.name}.executeBatch`, this);
    }
    async dbExists(dbName) {
        exception.throwNotImplementedException(`${this.constructor.name}.dbExists`, this);
    }
}

class DbHelperSqlServer extends DbHelperBase {
    async executeNonQuery({ query, dbName }) {
        try {
            const pool = await sql.connect({
                user: this.config.database.user,
                password: this.config.database.password,
                server: this.config.database.server,
                database: dbName ?? this.config.database.database,
                options: { encrypt: false }
            });

            result = await pool.request().query(query);

            await pool.close();
        } catch (ex) {
            throw new ExecuteQueryException(query, ex);
        }
    }
    async executeQuery({ query, dbName, noCatch = true }) {
        let result;

        try {
            const pool = await sql.connect({
                user: this.config.database.user,
                password: this.config.database.password,
                server: this.config.database.server,
                database: dbName ?? this.config.database.database,
                options: { encrypt: false }
            });

            result = await pool.request().query(query);

            await pool.close();

            result = result.recordset;
        } catch (ex) {
            throw new ExecuteQueryException(query, ex);
        }

        return result;
    }
    async executeBatch({ content, dbName }) {
        const parts = content.split(/\s+GO\s+/i);

        for (let part of parts) {
            // TODO: add line number to potential errors
            await this.executeQuery({ query: part, dbName });
        }
    }
    async dbExists(dbName) {
        try {
            await this.executeNonQuery({ query: 'declare @a int', dbName: "master" });
        } catch (ex) {
            throw new exception.Exception(`error connecting to database server`, ex);
        }

        try {
            await this.executeNonQuery({ query: 'use ' + dbName, dbName: "master" });
        } catch (ex) {
            throw new exception.Exception(`database ${dbName} does not exist`, ex);
        }
    }
}

function init(config) {
    if (!config.cliMode) {
        config.db = new DbHelperSqlServer(config.database);
        config.now = moment().locale(config.timestampLocale).format('YYYYMMDDHHmmss');

        const { currentBranch, realBranchName } = getCurrentBranch(config);

        config.currentBranch = currentBranch;
        config.realBranchName = realBranchName;
        config.paths.changesetsPath = path$1.join(config.basePath, config.paths.changesetFolderName);
        config.paths.scriptsPath = path$1.join(config.basePath, config.paths.scriptsFolderName);
        config.paths.backupFile = path$1.join(config.paths.backupDir, `backup-${config.database.database}-temp.bak`);

        config.folders = Object.assign({
            procedures: "Procedures",
            functions: "Functions",
            tables: "Tables",
            relations: "Relations",
            types: "Types",
            views: "Views",
            indexes: "Indexes",
            triggers: "Triggers",
            schemas: "Schemas"
        }, config.folders);

        if (!fs.readdirSync(config.paths.scriptsPath).some(folder =>
            Object.values(config.folders).some(f => folder === f)
        )) {
            throw new exception.Exception("Please specify all 'Scripts' subfolders in the 'folders' section of the config file.");
        }

        config.logger = new logging.ConsoleLogger({ env: "node" });
        config.debug = (...args) => {
            if (config.debugMode) {
                console.log(...args);
            }
        };
        config.warn = (...args) => {
            if (config.debugMode) {
                console.warn(...args);
            }
        };
        config.log = (...args) => {
            console.logger.log(...args);
        };
        config.danger = (...args) => {
            console.logger.danger(...args);
        };

        config.debug(`config = `, config);
    }
}

async function read(args) {
    function getArg(arg) {
        const index = args.indexOf(arg);
        const result = index >= 0 ? args[index + 1] : undefined;

        return result;
    }

    let config;
    let customConfig;
    const basePath = process.cwd();
    const changeset = getArg("-cs");
    const server = getArg("-s");
    const user = getArg("-u");
    const password = getArg("-p");
    const dbName = getArg("-d");
    let configPath = getArg("-c");
    let customizedConfigPath;

    if (configPath) {
        configPath = path$1.join(basePath, configPath);

        if (!fs.existsSync(configPath)) {
            throw new exception.Exception(`config file ${configPath} not found.`);
        }
    } else {
        const config_key = process.env["PDCSC_CONFIG_KEY"] || "PDCSC_CONFIG_MODE";
        let config_mode = process.env[config_key];

        if (config_mode) {
            config_mode = '.' + config_mode;
        }

        configPath = path$1.join(basePath, `pdcsc-config.json`);
        customizedConfigPath = path$1.join(basePath, `pdcsc-config${config_mode}.json`);
    }

    if (fs.existsSync(configPath)) {
        config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
    }

    if (fs.existsSync(customizedConfigPath)) {
        customConfig = JSON.parse(fs.readFileSync(customizedConfigPath, "utf-8"));
    }

    if (!base.isObject(config)) {
        config = {};
    }

    config = extensionsObject.merge({}, config, customConfig, { configPath, changeset, basePath });

    if (!base.isObject(config.database)) {
        config.database = {};
    }

    if (dbName) {
        config.database.database = dbName;
    }
    if (server) {
        config.database.server = server;
    }
    if (user) {
        config.database.user = user;
    }
    if (password) {
        config.database.password = password;
    }

    if (args.includes("-v")) {
        config.action = ActionType.getVersion;
    } else if (args.includes("-init")) {
        config.action = ActionType.init;
    } else if (args.includes("--init-full")) {
        config.action = ActionType.initfull;
    } else if (args.includes("-rop")) {
        config.action = ActionType.runOnPipline;
    } else if (args.includes("-ud")) {
        config.action = ActionType.runAllChangesets;

        const updatesMode = getArg("-rum");

        config.updateMode = UpdateMode.isValid(updatesMode) ?
            UpdateMode.getNumber(updatesMode) : UpdateMode.TestAndUpdate;
    } else if (args.includes("-uts")) {
        config.action = ActionType.updateTimestamp;
    } else {
        config.action = ActionType.createOrUpdateChangeset;
    }

    config.debugMode = args.includes("-dbm");
    config.runMode = config.action == ActionType.runOnPipline || config.action == ActionType.runAllChangesets;
    config.cliMode = config.action == ActionType.getVersion || config.action == ActionType.init || config.action == ActionType.initfull;

    return config
}

function validate(config) {
    if (base.isEmpty(config.database.server)) {
        throw new exception.Exception(`server not specified`);
    }

    if (base.isEmpty(config.database.user)) {
        throw new exception.Exception(`user not specified`);
    }

    if (base.isEmpty(config.database.password)) {
        throw new exception.Exception(`password not specified`);
    }

    if (base.isEmpty(config.database.database)) {
        throw new exception.Exception(`database not specified`);
    }

    if (!base.isObject(config.paths)) {
        config.paths = {};
    }

    if (base.isEmpty(config.paths.backupDir)) {
        config.paths.backupDir = "C:\\temp\\";
    }

    if (base.isEmpty(config.pipeline)) {
        config.pipeline = "gitlabs";
    }

    if (base.isEmpty(config.backupDbName)) {
        config.backupDbName = "TempBackupDB";
    }

    if (base.isEmpty(config.paths.changesetFolderName)) {
        config.paths.changesetFolderName = "Changes";
    }

    if (base.isEmpty(config.paths.scriptsFolderName)) {
        config.paths.scriptsFolderName = "Scripts";
    }

    if (base.isEmpty(config.masterBranchName)) {
        config.masterBranchName = "origin/main";
    }

    if (base.isEmpty(config.appVersionFormat)) {
        config.appVersionFormat = "YYYY-MM-DD HH:mm:ss";
    }

    if (base.isEmpty(config.timestampLocale)) {
        config.timestampLocale = "en";
    }

    if (base.isEmpty(config.changesetsTableName)) {
        config.changesetsTableName = "Changesets";
    }

    if (base.isEmpty(config.appVersionSprocName)) {
        config.appVersionSprocName = "dbo.getAppVersion";
    }

    if (config.changeset) {
        config.changesetFilePath = path.join(config.paths.changesetsPath, config.changeset);

        if (!fs.existsSync(config.changesetFilePath)) {
            if (!config.changeset.endsWith(".txt") && config.changeset.lastIndexOf(".") < 0) {
                const _changeset = `${config.changeset}.txt`;
                const _changesetFilePath = path.join(config.paths.changesetsPath, _changeset);

                if (!fs.existsSync(_changesetFilePath)) {
                    throw new exception.Exception(`Changeset file ${config.changeset} or ${_changeset} not found.`)
                } else {
                    config.changeset = _changeset;
                    config.changesetFilePath = _changesetFilePath;
                }
            } else {
                throw new exception.Exception(`Changeset file ${config.changeset} not found.`)
            }
        }
    }
}

async function getConfig(args) {
    const config = await read(args);

    validate(config);
    init(config);
    
    return config;
}

function checkDbExistence(config) {
    if (!config.cliMode) {
        config.db.dbExists(config.database.database);
    }
}

function containsAll(str, ...args) {
    let result = false;

    if (base.isSomeString(str)) {
        if (args.length) {
            result = true;

            const _str = str.toLowerCase();

            for (let arg of args) {
                const value = base.isNullOrUndefined(arg) ? "" : arg.toString().toLowerCase();

                if (!_str.includes(value)) {
                    result = false;
                    break;
                }
            }
        } else {
            result = true;
        }
    }

    return result;
}

function containsAny(str, ...args) {
    let result = true;

    if (base.isSomeString(str) && args.length) {
        result = false;

        const _str = str.toLowerCase();

        for (let arg of args) {
            const value = base.isNullOrUndefined(arg) ? "" : arg.toString().toLowerCase();

            if (_str.includes(value)) {
                result = true;
                break;
            }
        }
    }

    return result;
}

if (String.prototype.contains === undefined) {
    String.prototype.contains = function (...args) {
        return containsAll(this, ...args);
    };
}

if (String.prototype.containsAll === undefined) {
    String.prototype.containsAll = function (...args) {
        return containsAll(this, ...args);
    };
}

if (String.prototype.containsAny === undefined) {
    String.prototype.containsAny = function (...args) {
        return containsAny(this, ...args);
    };
}

function equals(str1, str2, ignoreCase = true) {
    let result = false;

    if (base.isString(str1) && base.isString(str2)) {
        result = ignoreCase ? str1.toLowerCase() == str2.toLowerCase(): str1 == str2;
    } else {
        result = base.isNullOrUndefined(str1) && base.isNullOrUndefined(str2);
    }

    return result;
}

if (String.prototype.equals === undefined) {
    String.prototype.equals = function (...args) {
        return equals(this, ...args);
    };
}

async function main() {
    let exitCode = 0;
    let error;
    let config;

    try {
        const args = process.argv.slice(2);

        config = await getConfig(args);

        checkForUpdate(config);
        checkDbExistence(config);

        switch (config.action) {
            case ActionType.getVersion:
                console.log("pdcsc version ", version);
                break;
            case ActionType.init:
            case ActionType.initfull:
                error = initProject(config);
                break;
            case ActionType.runOnPipline:
                error = await run(config);
                break;
            case ActionType.runAllChangesets:
                error = await run$1(config);
                break;
            case ActionType.createOrUpdateChangeset:
                error = await createChangeset(config);
                break;
            case ActionType.updateTimestamp:
                // TODO:
                // new action ==> update timestamp
                // if user asks us to update changeset timestamp, update existing
                // changeset's timestamp with current ts
                break;
        }
    } catch (ex) {
        error = ex;
        exitCode = 1;
    } finally {
        if (error) {
            console.error(error.toString());

            if (config && config.debugMode && error.stackTrace) {
                console.log(error.stackTrace);
            }
        }
    }

    process.exit(exitCode);
}

main();
