#!/usr/bin/env node
'use strict';

var chalk = require('chalk');
var semver = require('semver');
var child_process = require('child_process');
var _enum = require('@locustjs/enum');
var fs = require('fs');
var path$1 = require('path');
var exception = require('@locustjs/exception');
var simpleGit = require('simple-git');
var base = require('@locustjs/base');
var readline = require('readline');
var detectEncoding = require('detect-file-encoding-and-language');
var iconv = require('iconv-lite');
var ts = require('@puya/ts');
var moment = require('jalali-moment');
var sql = require('mssql');
var logging = require('@locustjs/logging');
var extensionsObject = require('@locustjs/extensions-object');

var name = "@puya/pdcsc";
var version = "2.0.1";

function checkForUpdate() {
    try {
        console.log("Checking for pdcsc update ...");

        const latest = child_process.execSync(`npm view ${name} version`, { encoding: "utf8" }).trim();

        if (semver.gt(latest, version)) {
            console.warn(`⚠️  Update available: ${chalk.yellow(latest)}`);
            console.log(`Run ${chalk.yellow(`npm update ${name}`)} to update.`);
        } else {
            console.log(`pdcsc is up-to-date.`);
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
}, 'ActionType');

const UpdateMode = _enum.Enum.define({
    TestAndUpdate: 0,
    Test: 1,
    Update: 2
}, 'UpdateMode');

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

    config.debug("Creating database backup...");

    const query = `BACKUP DATABASE [${dbName}] TO DISK = '${backupFile}' WITH INIT`;

    config.debug2(query);

    await db.executeQuery({ query });

    config.debug(`Database backup created: ${chalk.cyan(backupFile)}`);
}

async function dropTempDb(config) {
    const { db, backupDbName } = config;
    let error;

    try {
        config.debug(`Dropping temporary database ...`);
        
        const query = `IF EXISTS(SELECT name FROM sys.databases WHERE name = '${backupDbName}')
            DROP DATABASE[${backupDbName}]`;

        config.debug2(query);

        await db.executeQuery({ query });
    } catch (ex) {
        config.debug(`Dropping temporary database failed.`);

        error = ex;
    }

    if (!error) {
        config.debug(`Temporary database dropped successfully.`);
    }

    return error;
}

async function executeScript(config, script) {
    const { db, backupDbName } = config;

    config.debug("Executing script on temporary database ...");

    await db.executeBatch({ content: script, dbName: backupDbName });

    config.debug(`Script executed successfully.`);
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
        throw new exception.Exception(`Error fetching database FileGroups`, ex);
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

    config.debug("Restoring backup to temporary database...");

    const restoreCommand = await generateRestoreCommand(config);

    config.debug2(restoreCommand);

    await db.executeQuery({ query: restoreCommand });

    config.debug(`Backup restored: ${chalk.cyan(backupDbName)}`);
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
        for (let file of files) {
            await git.add(file);
        }

        await git.commit(message);
    } catch (ex) {
        error = ex;
    }

    return error;
}

async function testAndCommitChangeset(config) {
    const {
        scriptFilePath,
        scriptTempFilePath,
        finalChangesetFilePath,
        changesetTempFilePath
    } = config;
    const tempScriptContent = fs.readFileSync(scriptTempFilePath, "utf-8");

    console.log("Testing changeset ...");

    if (config.hasAnything) {
        config.error = await testScript(config, tempScriptContent);
    } else {
        console.log(`No changes detected. Testing changeset skipped.`);
    }

    if (config.error) {
        console.log(chalk.red("Failed.\n"));
        console.log("See error.log for more details");
    } else {
        if (config.hasAnything) {
            console.log(chalk.green("Passed.\n"));
        }
        
        try {
            fs.renameSync(scriptTempFilePath, scriptFilePath);
            fs.renameSync(changesetTempFilePath, finalChangesetFilePath);

            const changes = [finalChangesetFilePath];

            config.debug2("Commiting changes", changes);

            config.error = await commitChanges(changes, `pdcsc: changeset ${config.finalChangeset} ${config.isNewChangeset ? "created" : `updated`}.`);

            if (!config.error) {
                config.changesetCommitted = true;
            }
        } catch (ex) {
            config.error = new exception.Exception('error happened while renaming temp files or committing changes.', ex);
        }
    }

    return base.isNullOrEmpty(config.error);
}

function extractSections(config) {
    config.debug("Extracting sections ...");

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
    const content = fs.readFileSync(config.finalChangesetFilePath, "utf-8");

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

    config.debug("Creating new sections ...");

    // Todo:
    // we should detect sections just by ## and section name. equal sign characters are not important.
    // also, section end should not be mandatory.
    
    sections.forEach(section => {
        // Check if the section exists
        config.debug4(`Checking section ${chalk.yellow(section.name)} existence ...`);

        if (!content.includes(section.start) || !content.includes(section.end)) {
            throw new exception.Exception(`Section '${chalk.yellow(section.name)}' was not found in changeset.`);
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

                    if (!tempSections[section.name].contains(trimmedLine)) {
                        config.debug3(`\tItem Added: ${chalk.gray(trimmedLine)}`);

                        tempSections[section.name].push(trimmedLine);
                    } else {
                        config.debug3(`\tItem exists: ${chalk.gray(trimmedLine)}`);
                    }
                });
            } else {
                tempSections[section.name] = innerContent;
            }
        }
    });

    config.sections = tempSections;
    
    config.debug3("\nCurrent sections", tempSections);
}

function finalizeChangeset(config) {
    const { sections, dropStatements } = config;

    config.debug("Finalizing changeset ...");

    const content = `
## ===================== Custom-Start (start) ======================
${sections.customStart}${(dropStatements || "")}## ===================== Custom-Start ( end ) ======================

## ===================== Schemas (start) ======================
${sections.schemas.join("\n")}## ===================== Schemas ( end ) ======================

## ===================== Types (start) ======================
${sections.types.join("\n")}## ===================== Types ( end ) ======================

## ===================== Tables (start) ======================
${sections.tables.join("\n")}## ===================== Tables ( end ) ======================

## ===================== Relations (start) ======================
${sections.relations.join("\n")}## ===================== Relations ( end ) ======================

## ===================== Functions (start) ======================
${sections.functions.join("\n")}## ===================== Functions ( end ) ======================

## ===================== SPROCs (start) ======================
${sections.procedures.join("\n")}## ===================== SPROCs ( end ) ======================

## ===================== Views (start) ======================
${sections.views.join("\n")}## ===================== Views ( end ) ======================

## ===================== Indexes (start) ======================
${sections.indexes.join("\n")}## ===================== Indexes ( end ) ======================

## ===================== Triggers (start) ======================
${sections.triggers.join("\n")}## ===================== Triggers ( end ) ======================

## ===================== Custom-End (start) ======================
${sections.customEnd}## ===================== Custom-End ( end ) ======================
`;
    const old = fs.readFileSync(config.finalChangesetFilePath, "utf-8");

    if (old != content) {
        fs.writeFileSync(config.changesetTempFilePath, content, "utf-8");

        config.debug(`Temp changeset created: ${chalk.gray(config.changesetTemp)}`);

        return true;
    } else {
        console.log("Skipped changeset testing. No new changes detected.");

        return false;
    }
}

async function askIfGenerateDrops(config) {
    let result = false;

    // Todo: Done
    // move out this section and also cover committed deletions

    if (isSomeArray(config.finalDeleteds)) {
        const answer = await promptUser(`\nGenerate DROP statements (y/n)? `);

        result = answer == "y";
    }

    return result;
}

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

function generateDropScriptsIfRequested(config) {
    if (askIfGenerateDrops(config)) {
        config.debug("Generating drop statements ...");
        
        const { finalDeleteds, folders } = config;
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

        const dropQuery = finalDeleteds
            .map(file => {
                const parts = file.split('/');
                const folderName = parts[1]; // exp: Procedures
                const objectName = parts.slice(parts.length - 1).join('.').replace('.sql', ''); // exp: dbo.sp01
                const objectType = folderToObjectMap[folderName];

                config.debug3({ parts, folderName, objectName, objectType });

                if (!objectType) {
                    console.warn(`${chalk.yellow("Warning:")} sql deleted file ignored ${file} (unknown type: ${objectType}).`);

                    return null;
                }

                // Generate the appropriate DROP query
                return generateDropQuery(objectType, objectName);
            })
            .filter(query => query) // Remove null values
            .join('\n'); // Combine queries

        config.debug3({ drops: dropQuery });

        config.dropStatements = dropQuery;
    }
}

function promptUser$1(question, toLower = true) {
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

function filterChanges(config, changes) {
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

    config.debug2("git status", changes);

    statuses.filter(state => state != exclude)
        .forEach(state => {
            if (Array.isArray(changes[state])) {
                result[state] = filterChanges(config, changes[state]);

                all.push(...result[state]);
            }
        });

    result.all = all;

    return result;
}

async function checkUncommittedChanges(config) {
    let userChoice = "1";

    config.debug("Checking uncommitted sql changes ...");

    const changes = await getUncommittedSqlChanges(config);

    config.debug2({ changes });

    if (changes.all.length > 0) {
        do {
            console.warn(`
${chalk.yellow('Warning: You have uncommitted changes.')}`);

            userChoice = await promptUser$1(
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

                config.error = await commitChanges(changes.all, "pdcsc: commited current changes");
                break;
            } else if (userChoice === "3") {
                const files = [];

                if (changes.modified.length > 0) {
                    files.push(chalk.whiteBright("Modified files:"));
                    files.push(...changes.modified.map(chalk.blue));
                }
                if (changes.not_added.length > 0) {
                    files.push(chalk.whiteBright("Untracked files:"));
                    files.push(...changes.not_added.map(chalk.green));
                }
                if (changes.deleted.length > 0) {
                    files.push(chalk.whiteBright("Deleted files:"));
                    files.push(...changes.deleted.map(chalk.red));
                }

                if (files.length) {
                    console.log("\nUncommitted changes:\n");
                    console.log(files.join("\n"));
                } else {
                    console.log("\nNo uncommitted changes found.");
                }
            } else if (userChoice === "4") {
                console.log("\nOperation cancelled by the user.");
                userChoice = "";
                break;
            } else {
                console.log("Invalid choice.");
            }
        } while (true);
    } else {
        config.debug("Nothing found.");
    }

    if (!base.isArray(changes.deleted) || userChoice == "1") {
        changes.deleted = [];
    }

    config.userChoice = userChoice;
    config.uncommittedChanges = changes;
    
    return base.isNullOrEmpty(config.error) && base.isSomeString(userChoice);
}

function getNewChangeset(config) {
    let changeset;
    let changesetFilePath;

    const { now, currentBranch, mergeBase } = config;
    const { changesetsPath } = config.paths;

    //TODO: Done
    // add branch hash to changesets file name
    const hash = mergeBase ? '_' + mergeBase.substr(0, 8): '';
    
    changeset = `${now}${hash}_${currentBranch}.txt`;
    changesetFilePath = path$1.join(changesetsPath, changeset);

    return { changeset, changesetFilePath }
}

function createNewChangeset(config) {
    let changeset;
    let changesetFilePath;

    try {
        const cs = getNewChangeset(config);

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
        changeset = cs.changeset;
        changesetFilePath = cs.changesetFilePath;

        fs.writeFileSync(changesetFilePath, content);

        console.log(`New changeset ${chalk.cyan(path$1.parse(changeset).name)} created.`);
    } catch (ex) {
        if (changeset) {
            throw new exception.Exception(`Generating new changeset ${chalk.cyan(path$1.parse(changeset).name)} failed`, ex);
        } else {
            throw new exception.Exception(`Generating new changeset failed`, ex);
        }
    }

    return { changeset, changesetFilePath }
}

function getOrCreateChangeset(config) {
    let { changesetsPath } = config.paths;

    // Todo: Done
    // we should look up changeset not just by branch name, but also by branch hash.

    // Todo: Done
    // there is no need to check whether current changeset is followed by other changesets and ...

    config.debug("Preparing final changeset ...");

    if (!config.changeset) {
        if (!config.oldChangeset) {
            config.debug("No existing changeset found. Creating a new changeset ...");

            const cs = createNewChangeset(config);
            
            config.finalChangeset = cs.changeset;
            config.finalChangesetFilePath = cs.changesetFilePath;
            config.isNewChangeset = true;
        } else {
            config.debug("Working on existing changeset ...");

            config.finalChangeset = config.newChangeset;
            config.finalChangesetFilePath = config.newChangesetFilePath;
            config.isNewChangeset = false;    
        }
    } else {
        config.debug(`${chalk.yellow("Warning:")}: manual changeset specified (${chalk.cyan(config.changeset)}).`);

        config.finalChangeset = config.changeset;
        config.finalChangesetFilePath = config.changesetFilePath;
        config.isNewChangeset = false;
    }

    const cleanFilename = path$1.parse(config.finalChangeset).name;

    config.finalChangesetName = cleanFilename;
    config.changesetTemp = `${cleanFilename}~.txt`;
    config.changesetTempFilePath = path$1.join(changesetsPath, config.changesetTemp);
    config.scriptFilePath = path$1.join(changesetsPath, `${cleanFilename}.sql`);
    config.scriptTempFilePath = path$1.join(changesetsPath, `${cleanFilename}~.sql`);
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
        console.warn(chalk.yellow(`Warning: sql changed file ${file} ignored (unknown folder type).`));

        return false;
    }

    return true;
}

function getChangedFiles(config) {
    const { masterBranchName } = config;

    config.debug("Getting all changes in .sql files ...");

    try {
        const mergeBase = child_process.execSync(
            `git merge-base HEAD ${masterBranchName}`,
            { encoding: "utf-8" }
        ).trim();

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

        config.debug2("\ndeleted files", deletedFiles);

        const allFiles = [...modifiedAndAddedFiles, ...renamedFiles];
        const finalChanges = allFiles.filter((file) => isValidScriptFile(config, file));

        config.debug2("\nFinal changes", finalChanges);

        config.finalDeleteds = [...config.uncommittedChanges.deleted, ...deletedFiles];
        config.finalChanges = finalChanges;
    } catch (ex) {
        throw new exception.Exception(`Error extracting changes from git logs`, ex);
    }
}

async function compareWithOrigin(config) {
    const { masterBranchName, realBranchName } = config;

    config.debug(`Initializing simpleGit ...`);

    const git = simpleGit();

    if (masterBranchName) {
        try {
            do {
                config.debug(`Checking if we are a git repo ...`);

                let isRepo = false;

                try {
                    isRepo = await git.checkIsRepo();
                } catch (ex) {
                    config.error = ex;

                    break;
                }

                if (!isRepo) {
                    config.error = 'We are not a git repository.';
                    break;
                } else {
                    config.debug("We are a git repo.");
                }

                config.debug("Fetching origin ...");

                const [origin, branch] = masterBranchName.split("/");

                config.debug2({ origin, branch });

                await git.fetch(origin, branch);

                config.debug("Fetch completed.");
                config.debug(`Checking if master branch ${chalk.yellow(masterBranchName)} is valid ...`);

                const branches = await git.branch(['-r']);

                config.debug4('remote branches', branches);

                if (!branches.all || !branches.all.includes(masterBranchName)) {
                    config.error = `Remote branch ${chalk.yellow(masterBranchName)} does not exist.`;
                    break;
                } else {
                    config.debug("master branch is valid.");
                }

                const base = await git.raw(['merge-base', realBranchName, masterBranchName]);

                config.debug2('merge-base =', base);
                config.debug3(`Getting git logs from base ${base} to ${masterBranchName}...`);

                config.debug("Checking if we are behind master branch ...");

                const logs = await git.log({ from: base.trim(), to: masterBranchName });

                config.debug3('\nlogs', logs);

                if (logs.total > 0) {
                    console.warn(`${chalk.yellow("Warning:")} you are behind ${masterBranchName} by ${logs.total} commits.`);
                    console.log(`Please run ${chalk.yellow(`git pull ${masterBranchName}`)} to sync with the latest changes from master branch.`);

                    config.error = " ";
                } else {
                    config.debug("We are not behind master branch.");
                }
            } while (false);
        } catch (ex) {
            config.error = new exception.Exception(`Error checking ${masterBranchName} branch:`, ex);
        }
    } else {
        config.error = "no master branch is specified";
    }

    return base.isNullOrEmpty(config.error);
}
// export default c1;

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
        throw new exception.Exception(`Timestamp using ${chalk.yellow("@puya/ts")} not generated successfully.`, res.err);
    }
    
    return res.data;
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
        throw new exception.Exception(`Unsupported encoding ${chalk.yellow(result)} (${info.encoding}) in ${filepath}`);
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

function extractObjects(config, changesetPath) {
    const objects = [];
    let currentSection = "";
    let customStart = "";
    let customEnd = "";

    const lines = fs.readFileSync(changesetPath, "utf-8").split("\n");

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

    config.debug2(`Total objects: ${objects.length}`);

    return { objects, customStart, customEnd };
}

async function renderChangesetScript(config, changesetPath, changesetName, deleteds, allFiles) {
    let error;
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

    const { objects, customStart, customEnd } = extractObjects(config, changesetPath);

    if (!base.isArray(deleteds)) {
        deleteds = [];
    }
    
    if (!base.isArray(allFiles)) {
        allFiles = getAllSqlFiles(config.paths.scriptsPath);
    }

    for (const obj of objects) {
        let found = false;

        if (deleteds.find(filePath => {
            const fileName = path$1.basename(filePath);

            return filePath.contains(config.folders[obj.type]) && fileName.contains(obj.name);
        })) {
            found = true;
            break;
        } else {
            for (const filePath of allFiles) {
                const fileName = path$1.basename(filePath);


                if (base.isNullOrEmpty(config.folders[obj.type])) {
                    throw new exception.Exception(`Missing script folder for ${chalk.yellow(obj.type)}`)
                }

                // TODO: Done
                // Filepath must be checked - Relation and Table conflict here (same names)
                if (filePath.contains(config.folders[obj.type]) && fileName.contains(obj.name)) {
                    // TODO: Done
                    // read files based on their encoding
                    const content = await readFile(filePath, config.defaultCodePage);

                    sb[obj.type].push(content);

                    found = true;

                    config.debug2(`${obj.type}: ${obj.name} copied.`);

                    break;
                }
            }
        }

        // TODO: Done
        // check object's file existence and throw error if not found

        if (!found) {
            error = `Render changeset failed. ${chalk.yellow(config.folders[obj.type])}: ${chalk.yellow(obj.name)} file not found.`;
        }
    }

    const hasAnything = !base.isEmpty(customStart) ||
        !base.isEmpty(customEnd) ||
        base.isSomeArray(sb.schemas) ||
        base.isSomeArray(sb.types) ||
        base.isSomeArray(sb.tables) ||
        base.isSomeArray(sb.relations) ||
        base.isSomeArray(sb.functions) ||
        base.isSomeArray(sb.procedures) ||
        base.isSomeArray(sb.views) ||
        base.isSomeArray(sb.indexes) ||
        base.isSomeArray(sb.triggers);

    const script = `-- ***            Changeset ${changesetName}          ***
-- ===================== Custom-Start (start) ======================
${customStart}-- ===================== Custom-Start ( end ) ======================

-- ===================== Schemas (start) ======================
${sb.schemas.join("\n")}-- ===================== Schemas (end) ======================

-- ===================== Types (start) ======================
${sb.types.join("\n")}-- ===================== Types (end) ======================

-- ===================== Tables (start) ======================
${sb.tables.join("\n")}-- ===================== Tables (end) ======================

-- ===================== Relations (start) ======================
${sb.relations.join("\n")}-- ===================== Relations (end) ======================

-- ===================== Functions (start) ======================
${sb.functions.join("\n")}-- ===================== Functions (end) ======================

-- ===================== Procedures (start) ======================
${sb.procedures.join("\n")}-- ===================== Procedures (end) ======================

-- ===================== Views (start) ======================
${sb.views.join("\n")}-- ===================== Views (end) ======================

-- ===================== Indexes (start) ======================
${sb.indexes.join("\n")}-- ===================== Indexes (end) ======================

-- ===================== Triggers (start) ======================
${sb.triggers.join("\n")}-- ===================== Triggers (end) ======================

-- ===================== Custom-End (start) ======================
${customEnd}-- ===================== Custom-End ( end ) ======================

go
${getAppVersion(config)}

go
`;

    return { script, error, hasAnything }
}

async function saveFinalScript(config, allFiles) {
    config.debug("Saving final changeset script ...");

    const { scriptTempFilePath, changesetTempFilePath, finalChangesetName, finalDeleteds } = config;
    const { script, error, hasAnything } = await renderChangesetScript(config, changesetTempFilePath, finalChangesetName, finalDeleteds, allFiles);

    if (!error) {
        fs.writeFileSync(scriptTempFilePath, script, "utf-8");

        config.debug("Temp changeset saved.");
    }

    config.error = error;
    config.hasAnything = hasAnything;

    return base.isNullOrEmpty(config.error);
}

function equals(str1, str2, ignoreCase = true) {
    let result = false;

    if (base.isString(str1) && base.isString(str2)) {
        result = ignoreCase ? str1.toLowerCase() == str2.toLowerCase(): str1 == str2;
    } else {
        result = base.isNullOrEmpty(str1) && base.isNullOrEmpty(str2);
    }

    return result;
}

if (String.prototype.equals === undefined) {
    String.prototype.equals = function (...args) {
        return equals(this, ...args);
    };
}

function updateSections(config, allFiles) {
    const { folders, sections, finalDeleteds, finalChanges } = config;
    
    config.debug("Updating sections with new changes ...");
    config.debug2({ finalDeleteds });
    
    config.debug2("\nadding new changes to sections ...");

    finalChanges.forEach((file) => {
        let fileName = path$1.basename(file);
        let dotIndex = fileName.indexOf(".");
        let nonSchemaFileName = dotIndex >= 0 ? fileName.substr(dotIndex + 1) : "";

        config.debug3(`\tchange = ${chalk.yellow(file)}`);

        for (const [section, folder] of Object.entries(folders)) {
            if (file.contains(`${config.paths.scriptsFolderName}/${folder}/`)) {
                if (sections[section].contains(fileName) || sections[section].contains(nonSchemaFileName)) {
                    if (finalDeleteds.contains(file)) {
                        console.warn(`${chalk.yellow("Warning: ")}${fileName} removed from changeset (its file is deleted).\n`);

                        const index = sections[section].findIndex(x => equals(x, fileName) || equals(x, nonSchemaFileName));

                        if (index >= 0) {
                            config.debug3(`\t\tsection: ${chalk.yellow(section)}: removed`);

                            sections[section].splice(index, 1);
                        } else {
                            config.debug3(`\t\tsection: ${chalk.yellow(section)}: item not found!`);
                        }
                    } else {
                        config.debug3(`\t\tsection: ${chalk.yellow(section)}: already exists`);
                    }
                } else {
                    if (!finalDeleteds.contains(file)) {
                        config.debug3(`\t\tsection: ${chalk.yellow(section)}: added`);

                        sections[section].push(fileName);
                    } else {
                        config.debug3(`\t\tsection: ${chalk.yellow(section)}: skipped (deleted)`);
                    }
                }
            }
        }
    });

    config.debug2("\nremoving changeset items that are deleted ...");

    finalDeleteds.forEach(file => {
        let fileName = path$1.basename(file);
        let dotIndex = fileName.indexOf(".");
        let nonSchemaFileName = dotIndex >= 0 ? fileName.substr(dotIndex + 1) : "";

        config.debug3(`\tdeleted file = ${chalk.yellow(file)}`);

        for (const [section, folder] of Object.entries(folders)) {
            if (file.contains(`${config.paths.scriptsFolderName}/${folder}/`)) {
                if (sections[section].contains(fileName) || sections[section].contains(nonSchemaFileName)) {
                    if (finalDeleteds.contains(file)) {
                        console.warn(`${chalk.yellow("Warning: ")}${fileName} removed from changeset (its file is deleted).\n`);

                        const index = sections[section].findIndex(x => equals(x, fileName) || equals(x, nonSchemaFileName));

                        if (index >= 0) {
                            config.debug3(`\t\tsection: ${chalk.yellow(section)}: removed`);

                            sections[section].splice(index, 1);
                        } else {
                            config.debug3(`\t\tsection: ${chalk.yellow(section)}: item not found!`);
                        }
                    }
                }
            }
        }
    });

    config.debug2("\nchecking if items exist ...");

    for (const [section, folder] of Object.entries(folders)) {
        for (let item of sections[section]) {
            let found = false;

            for (const filePath of allFiles) {
                const fileName = path$1.basename(filePath);

                if (filePath.contains(sections[section]) && (fileName.contains(item) || fileName.contains())) {
                    found = true;

                    break;
                }
            }

            if (!found) {
                config.error = `The source file for changeset item ${chalk.yellow(item)} in ${chalk.yellow(sections[section])} folder was not found.`;

                break
            }
        }

        if (config.error) {
            break;
        }
    }

    return base.isNullOrEmpty(config.error);
}

function checkIfBranchAlreadyMerged(config) {
    const { realBranchName, masterBranchName } = config;

    try {
        config.debug("Checking if branch alrady merged ...");
        
        const result = child_process.execSync(
            `git merge-base --is-ancestor ${realBranchName} ${masterBranchName} && echo "merged" || echo "not merged"`,
            { encoding: "utf-8" }
        );

        if (result.trim() == "merged") {
            config.error = `branch ${realBranchName} already merged into ${masterBranchName}.
Changing already merged branches is forbidden.
Please create a new branch.`;
        } else {
            config.debug("Branch is ok (not merged).");
        }
    } catch (ex) {
        config.error = new exception.Exception("Error happened while checking branch with origin", ex);
    }

    return base.isNullOrEmpty(config.error);
}

async function updateChangesetTimestampIfNeeded(config) {
    let { changesetsPath } = config.paths;

    if (!config.changeset && config.oldChangeset) {
        try {
            const changes = [];
            const cs = getNewChangeset(config);

            config.newChangeset = cs.changeset;
            config.newChangesetName = path$1.parse(config.newChangeset).name;
            config.newChangesetFilePath = cs.changesetFilePath;

            changes.push(config.oldChangesetFilePath);
            changes.push(cs.changesetFilePath);

            fs.renameSync(config.oldChangesetFilePath, cs.changesetFilePath);

            const oldSqlFileName = config.oldChangesetName + '.sql';
            config.oldSqlFilePath = path$1.join(changesetsPath, oldSqlFileName);

            if (fs.existsSync(config.oldSqlFilePath)) {
                const newSqlFileName = config.newChangesetName + '.sql';
                const newSqlFilePath = path$1.join(changesetsPath, newSqlFileName);

                fs.renameSync(config.oldSqlFilePath, newSqlFilePath);
            }

            // we directly commit changeset timestamp update.
            // this is necessary. we do not ask user consent on this.

            config.error = await commitChanges(changes, `pdcsc: changeset timestamp updated.
${config.oldChangesetName} => ${config.newChangesetName}`);

            if (!config.error) {
                config.debug(`Changeset timestamp updated.`);
                config.debug2(`  old: ${chalk.blue(config.oldChangesetName)}, new: ${chalk.cyan(config.newChangesetName)}`);
            } else {
                config.error = new exception.Exception(`Updating changeset timestamp failed (old: ${config.oldChangesetName}, new: ${config.newChangesetName}).`, config.error);
            }
        } catch (ex) {
            config.error = new exception.Exception(`updating changeset timestamp failed.`, ex);
        }
    }

    return base.isNullOrEmpty(config.error);
}

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

function restoreCommittedChanges(num) {
    const command = `git reset --mixed HEAD~${num ?? 1}`;

    try {
        child_process.execSync(
            command,
            { encoding: "utf-8" }
        ).trim();

        console.log("   commited changes are restored back.");
    } catch (error) {
        throw new exception.Exception("ERROR!! RESTORING COMMITTED CHANGES FAILED.\nYOU MUST RESTORE CHANGES MANUALLY.\n\n" + command, error)
    }
}

function restoreChangesIfNeeded(config) {
    const {
        scriptTempFilePath,
        changesetTempFilePath,
        finalChangesetFilePath,
        isNewChangeset,
        changesetCommitted,
        userChoice,
        error
    } = config;

    FileHelper.deleteFiles(scriptTempFilePath, changesetTempFilePath);

    if (error && isNewChangeset) {
        // we do not delete changeset script.
        // changeset scripts are ignored in .gitignore and are not committed.
        FileHelper.deleteFile(finalChangesetFilePath);
    }

    if (error) {
        if (userChoice === "2") {
            // restoring back committed changes depends on whether we commited changeset or not.
            // if the changeset is committed, we should restore 2 level back, otherwise 1 level back

            restoreCommittedChanges(changesetCommitted ? 2 : 1);
        } else if (changesetCommitted) {
            // user didn't ask to commit sql changes.
            // only changeset was committed. we should restore only 1 level back.

            restoreCommittedChanges(1);
        }
    }
}

async function createOrUpdateChangeset(config) {
    if (!config.debugMode) {
        console.log((config.oldChangeset ? "Updating" : "Creating") + ` changeset ...\n  ${chalk.gray("This may take a while. Please wait.")}`);
    }

    try {
        do {
            if (!await compareWithOrigin(config)) {
                break
            }

            // TODO: Done
            // if current branch already merged with origin, exit.
            // we should not allow changing previous branches.
            // we show a message that user should create a new branch
            // if he intends to change previous branches.

            if (!checkIfBranchAlreadyMerged(config)) {
                break
            }

            // Todo: Done
            // we should update changeset timestamp always.

            if (!await updateChangesetTimestampIfNeeded(config)) {
                break
            }

            if (!await checkUncommittedChanges(config)) {
                break;
            }

            getOrCreateChangeset(config);

            extractSections(config);

            getChangedFiles(config);

            // Todo: Done
            // merge deletedFiles from getChangedFiles() and config.uncommittedChanges.deleted

            const allFiles = getAllSqlFiles(config.paths.scriptsPath);

            if (!updateSections(config, allFiles)) {
                break;
            }

            // Todo
            // detect and warn about changeset items that cannot be found in file system

            generateDropScriptsIfRequested(config);

            // Todo: Done
            // skip test and commit if changeset has no new changes

            if (finalizeChangeset(config)) {
                if (!await saveFinalScript(config, allFiles)) {
                    break;
                }

                if (!await testAndCommitChangeset(config)) {
                    break;
                }
            }

            console.log('Operation completed.');
        } while (false);
    } catch (ex) {
        config.error = ex;
    } finally {
        restoreChangesIfNeeded(config);
    }


    return config.error;
}

async function initGitRepo(git) {
    let error;

    do {
        const choice = await promptUser$1("Would you like to initialize a git repository(Y/N)? ");

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
/Changes/error.log
/Changes/*.sql
/Changes/*~.txt
`;
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

            config.debug(`Checking if we are a git repo ...`);

            let hasGitRepo = await git.checkIsRepo();

            if (!hasGitRepo) {
                error = await initGitRepo(git);

                if (error) {
                    break;
                }

                hasGitRepo = true;
            } else {
                config.debug("We are in a git repo.");
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

            config.debug("Creating script folders ...");
            config.debug2(folders);

            folders.forEach(folder => FileHelper.createDir(basePath, folder, true));

            config.debug("Creating .gitlab-ci.yml file ...");

            const gitlabCI = FileHelper.createFile(basePath, ".gitlab-ci.yml", gitlabCiContent(), true);

            config.debug("Creating pdcsc-config.json ...");

            const pdcscConfig = FileHelper.createFile(basePath, "pdcsc-config.json", pdcscConfigContent(config), true);

            config.debug("Creating .gitignore ...");

            const gitIgnore = FileHelper.createFile(basePath, ".gitignore", gitignoreContent(), true);

            config.debug("Committing changes ...");

            error = await commitChanges([gitlabCI, pdcscConfig, gitIgnore], "pdcsc: initialized files and folders.");
        } catch (ex) { error = ex; }
    } while (false);

    return error;
}

async function ensureChangesTableCreated(config) {
    config.debug("Ensuring Changesets table existence ...");

    const { db, changesetsTableName } = config;

    const query = `IF OBJECT_ID('${changesetsTableName}', 'U') IS NULL
                    CREATE TABLE ${changesetsTableName}
                    (
                        [Id] INT IDENTITY(1,1) PRIMARY KEY,
                        [Name] NVARCHAR(255) NOT NULL,
                        [Date] DATETIME NOT NULL DEFAULT(GETDATE())
                    );`;
    config.debug2(query);

    await db.executeQuery({ query });
}

async function addChangesetToDatabase(config, changeset) {
    const { db, changesetsTableName } = config;

    console.log(`   Adding changeset to database ...`);

    try {
        const query = `INSERT INTO ${changesetsTableName} ([name]) VALUES ('${changeset.name}')`;

        config.debug2(query);

        await db.executeQuery({ query });

        console.log(`Changeset added.`);
    } catch (ex) {
        throw new exception.Exception(`Error adding changeset ${chalk.cyan(changeset.name)} to database`, ex);
    }
}

async function runAndAddChangeset(config, changeset) {
    console.log(`Executing changeset ${chalk.cyan(changeset.name)} on database ...`);

    const { db } = config;
    let error;

    try {
        const content = fs.readFileSync(changeset.path, "utf-8");

        await db.executeBatch({ content });

        console.log(`  ${chalk.green("Succeeded.")}`);

        await addChangesetToDatabase(config, changeset);
    } catch (ex) {
        console.log(`  ${chalk.red("Failed.")}`);
        console.log("See error.log for more details.");

        error = ex;

        createErrorLog(config, ex);
    }

    return error;
}

async function testPendingChangesets(config, pendingChangesets) {
    let error;

    config.debug("Testing changesets ...");

    try {
        const scripts = [];

        for (let changeset of pendingChangesets) {
            config.debug2(changeset);
            
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

    config.debug("Getting last executed changeset on database ...");

    try {
        const query = `SELECT TOP 1 [date], [name] FROM ${changesetsTableName} ORDER BY [date] DESC`;

        config.debug2(query);

        const rs = await db.executeQuery({ query });

        result = rs && rs.length ? rs[0] : null;

        if (result) {
            config.debug(`Last changeset is ${chalk.cyan(result)}.`);
        } else {
            config.debug('No changeset has already executed on database.');
        }
    } catch (ex) {
        throw new exception.Exception(`Cannot fetch last executed changeset`, ex);
    }

    return result;
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
            throw new exception.Exception("No date found in the input string.");
        }
    } catch (ex) {
        throw new exception.Exception("Extracting date error", ex);
    }
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

async function getChangesetContent(config) {
    config.debug("Getting changeset content ...");

    let content;
    let error;
    const { oldChangeset, oldChangesetFilePath, realBranchName } = config;
    const { changesetsPath } = config.paths;

    // Todo: Done
    // we should find changeset based on branchname AND merge-base

    if (oldChangeset) {
        const existingDate = extractDateFromString(oldChangeset);

        // Todo: Done
        // if there is a git commit after last pdcsc execution,
        // we should stop pipeline and generate error.
        // user must always use pdcsc.
        const lastCommit = child_process.execSync('git log --pretty=format:"%s" HEAD^..HEAD ', { encoding: "utf-8" }).trim();

        if (lastCommit && !lastCommit.startsWith('pdcsc: changeset timestamp updated')) {
            error = `Changeset is not up-to-date (other commits found after last changeset push).
Please update your changeset and try again.`;
        } else {
            // Todo: Done
            // we should exit pipeline if we detect our changeset is followed by other changesets
            // i.e. other branches are merged before us (our timestamp is behind them).

            const fileNames = fs.readdirSync(changesetsPath);

            if (fileNames.filter(file => file.endsWith(".txt")).some(x => extractDateFromString(x) > existingDate)) {
                error = `The changeset ${chalk.cyan(oldChangeset)} is followed by other changesets.
Cannot merge branch. Please sync your branch and try again.`;
            } else {
                // Todo: Done
                // we should generate changeset script dynamically, not read it from .sql

                const cr = await renderChangesetScript(config, oldChangesetFilePath, path$1.parse(oldChangeset).name);

                if (cr.error) {
                    error = cr.error;
                } else if (cr.hasAnything) {
                    content = cr.script;
                } else {
                    error = 'Changeset is empty and has no changes.';
                }
            }
        }
    } else {
        error = `No changeset found for branch ${chalk.yellow(realBranchName)}`;
    }

    return { content, error };
}

async function executeChangeset(config, changeset) {
    let error;
    const { db } = config;
    const { database } = config.database;

    try {
        console.log(`Executing changeset on ${chalk.magenta(database)} database ...`);

        await db.executeBatch({ content: changeset });

        console.log(`Script executed successfully`);
    } catch (ex) {
        error = new exception.Exception(`executing changeset on ${database} failed`, ex);
    }

    return error;
}

async function run(config) {
    let { content, error } = await getChangesetContent(config);
    
    if (content) {
        error = await testScript(config, content);

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
    constructor(config) {
        super(config);
    }
    async executeNonQuery({ query, dbName }) {
        let pool;
        let conn_ok = false;
        let error;

        try {
            try {
                pool = await sql.connect({
                    user: this.config.user,
                    password: this.config.password,
                    server: this.config.server,
                    database: dbName ?? this.config.database,
                    options: { encrypt: false }
                });

                conn_ok = true;
            } catch (e) {
                console.log(e);
            }

            if (conn_ok) {
                await pool.request().query(query);
            }
        } catch (ex) {
            error = new ExecuteQueryException(query, ex);
        } finally {
            if (pool && conn_ok) {
                try {
                    await pool.close();
                } catch (e) {
                    console.error(e);
                }
            }
        }

        if (error) {
            throw error;
        }
    }
    async executeQuery({ query, dbName, noCatch = true }) {
        let result;
        let pool;
        let error;
        let conn_ok = false;

        try {
            try {
                pool = await sql.connect({
                    user: this.config.user,
                    password: this.config.password,
                    server: this.config.server,
                    database: dbName ?? this.config.database,
                    options: { encrypt: false }
                });

                conn_ok = true;
            } catch (e) {
                console.log(e);
            }

            if (conn_ok) {
                result = await pool.request().query(query);

                result = result.recordset;
            }
        } catch (ex) {
            error = new ExecuteQueryException(query, ex);
        } finally {
            if (pool && conn_ok) {
                try {
                    await pool.close();
                } catch (e) {
                    console.error(e);
                }
            }
        }

        if (error) {
            throw error;
        }

        return result;
    }
    async executeBatch({ content, dbName }) {
        const parts = content.split(/\s+GO\s+/i);

        for (let part of parts) {
            // TODO:
            // add line number to potential errors
            await this.executeQuery({ query: part, dbName });
        }
    }
    async dbExists(dbName) {
        try {
            await this.executeNonQuery({ query: 'declare @a int', dbName: "master" });
        } catch (ex) {
            throw new exception.Exception(`Error connecting to database server`, ex);
        }

        try {
            await this.executeNonQuery({ query: 'use ' + dbName, dbName: "master" });
        } catch (ex) {
            throw new exception.Exception(`Database ${chalk.magenta(dbName)} does not exist`, ex);
        }
    }
}

function getCurrentBranchChangeset(config) {
    let changeset;
    const { currentBranch, mergeBase } = config;
    const hash = mergeBase ? '_' + mergeBase.substr(0, 8): '';
    const regex = new RegExp(`^\\d+${hash}_${currentBranch}\\.txt$`);
    const { changesetsPath } = config.paths;
    const fileNames = fs.readdirSync(changesetsPath);

    for (const fileName of fileNames) {
        if (regex.test(fileName)) {
            changeset = fileName;

            console.log(`Found existing changeset ${chalk.cyan(path$1.parse(changeset).name)}`);

            break;
        }
    }

    return changeset;
}

async function init(config) {
    if (!config.cliMode) {
        config.db = new DbHelperSqlServer(config.database);
        config.now = moment().locale(config.timestampLocale).format('YYYYMMDDHHmmss');

        const { currentBranch, realBranchName } = getCurrentBranch(config);

        console.log(`Current branch: ${chalk.yellow(realBranchName)}`);

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
        config.debug1 = (...args) => {
            if (config.debugMode && config.debugLevel.contains("1")) {
                console.log(...args);
            }
        };
        config.debug2 = (...args) => {
            if (config.debugMode && config.debugLevel.contains("2")) {
                console.log(...args);
            }
        };
        config.debug3 = (...args) => {
            if (config.debugMode && config.debugLevel.contains("3")) {
                console.log(...args);
            }
        };
        config.debug4 = (...args) => {
            if (config.debugMode && config.debugLevel.contains("4")) {
                console.log(...args);
            }
        };

        const git = simpleGit();

        config.mergeBase = await git.raw(['merge-base', realBranchName, config.masterBranchName]);

        if (!config.mergeBase) {
            console.warn(`warning: merge-base for current branch (${realBranchName}) not found!`);
        } else {
            config.debug2('merge-base =', config.mergeBase);
        }

        config.oldChangeset = getCurrentBranchChangeset(config);

        if (config.oldChangeset) {
            config.oldChangesetName = path$1.parse(config.oldChangeset).name;
            config.oldChangesetFilePath = path$1.join(config.paths.changesetsPath, config.oldChangeset);
        }

        config.debug4(`config = `, config);
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
            throw new exception.Exception(`config file ${chalk.yellow(configPath)} not found.`);
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
    } else {
        config.action = ActionType.createOrUpdateChangeset;
    }

    config.debugMode = args.includes("-dbm");
    config.debugLevel = (getArg("-dbl") || "").split("");

    config.runMode = config.action == ActionType.runOnPipline || config.action == ActionType.runAllChangesets;
    config.cliMode = config.action == ActionType.getVersion || config.action == ActionType.init || config.action == ActionType.initfull;

    return config
}

function validate(config) {
    let error;

    if (base.isEmpty(config.database.server)) {
        error = `database server not specified`;
    } else if (base.isEmpty(config.database.user)) {
        error = `database user not specified`;
    } else if (base.isEmpty(config.database.password)) {
        error = `database password not specified`;
    } else if (base.isEmpty(config.database.database)) {
        error = `database not specified`;
    } else {
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
                        error = `Changeset file ${chalk.cyan(config.changeset)} or ${chalk.cyan(_changeset)} not found.`;
                    } else {
                        config.changeset = _changeset;
                        config.changesetFilePath = _changesetFilePath;
                    }
                } else {
                    error = `Changeset file ${chalk.cyan(config.changeset)} not found.`;
                }
            }
        }
    }

    return error;
}

async function getConfig(args) {
    let error;
    const config = await read(args);

    error = validate(config);
    
    if (!error) {
        await init(config);
    }
    
    return { config, error };
}

async function checkDbExistence(config) {
    let result = false;

    config.debug(`Checking master database ${chalk.magenta(config.database.database)} ...`);

    if (!config.cliMode) {
        try {
            await config.db.dbExists(config.database.database);

            config.debug(`database exists`);

            result = true;
        } catch (ex) {
            console.error(chalk.red(`Master database does not exist or cannot check its existence.
Operation aborted.`));
            config.debug(ex);
        }
    } else {
        result = true;
    }

    return result;
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

// --------------------------------------------
//              String extensions
// --------------------------------------------

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

// --------------------------------------------
//              Array extensions
// --------------------------------------------

if (Array.prototype.contains === undefined) {
    Array.prototype.contains = function (arg) {
        let result = false;

        for (let item of this) {
            if ((item || "").toString().contains(arg)) {
                result = true;
                break;
            }
        }

        return result;
    };
}

function intro() {
    console.log(chalk.whiteBright(`Puya Data Changeset Creator 2024-2025\n`));
}

async function main() {
    intro();

    let exitCode = 0;
    let error;
    let config;

    try {
        const args = process.argv.slice(2);

        if (!process.argv.includes("-iuc")) {
            checkForUpdate();
        }

        const gcr = await getConfig(args);

        config = gcr.config;
        error = gcr.error;

        if (!error) {
            if (await checkDbExistence(config)) {
                switch (config.action) {
                    case ActionType.getVersion:
                        console.log(`${name} version ${version})\n`);
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
                        error = await createOrUpdateChangeset(config);
                        break;
                }
            }
        }
    } catch (ex) {
        error = ex;
        exitCode = 2;
    } finally {
        if (error) {
            console.error(chalk.red(error.toString()));

            if (config && config.debugMode && error instanceof exception.Exception) {
                console.error(JSON.stringify(error, null, 4));
            }

            if (exitCode == 0) {
                exitCode = 1;
            }
        }
    }

    return { exitCode, config };
}

main().then(({ exitCode, config }) => {
    if (config && config.debugMode) {
        console.log({ exitCode });
    }

    process.exit(exitCode);
}).catch((...args) => {
    console.error(...args);
    
    process.exit(3);
});
