#!/usr/bin/env node
const { processChangeset } = require("./ProcessChangeset.js");
const validateConfig = require('./validateConfig.js');
const readline = require("readline");
const fs = require("fs");
const path = require("path");
const simpleGit = require("simple-git");
const { execSync } = require("child_process");
const { Timestamper } = require('@puya/ts');
const moment = require("jalali-moment");
const sql = require("mssql");

const basePath = process.cwd();
let configPath;
let now;
let config;
let changesetPath;
const git = simpleGit();
let currentBranch;
let realBranchName;
let backupFile;
let appVersionFormat;
let server;
let user;
let password;
let databaseName;
let credentials;
const backupDbName = 'TempBackupDB';
let timestampLocale;
let masterBranchName;
const appVersionSporcTemplate = `create or alter proc dbo.getAppVersion as select '{ts}'`;
let userChoice;
let innerContent;
let changesetContent;
let changesetFile;

async function validateCommandLineArgs() {
    const args = process.argv.slice(2);

    const RunOnPipline = args.includes("-rop") ? true : false;

    const changesetFileArgIndex = args.indexOf("-csf");
    if (changesetFileArgIndex !== -1 && args[changesetFileArgIndex + 1]) {
        changesetFile = args[changesetFileArgIndex + 1];
    }
    const serverArgIndex = args.indexOf("-s");
    if (serverArgIndex !== -1 && args[serverArgIndex + 1]) {
        server = args[serverArgIndex + 1];
    }

    const userArgIndex = args.indexOf("-u");
    if (userArgIndex !== -1 && args[userArgIndex + 1]) {
        user = args[userArgIndex + 1];
    }

    const passwordArgIndex = args.indexOf("-p");
    if (passwordArgIndex !== -1 && args[passwordArgIndex + 1]) {
        password = args[passwordArgIndex + 1];
    }

    const databaseNameArgIndex = args.indexOf("-d");
    if (databaseNameArgIndex !== -1 && args[databaseNameArgIndex + 1]) {
        databaseName = args[databaseNameArgIndex + 1];
    }

    const configFileNameArgIndex = args.indexOf("-c");
    if (configFileNameArgIndex !== -1 && args[configFileNameArgIndex + 1]) {
        configPath = path.join(basePath, args[configFileNameArgIndex + 1]);

        if (!fs.existsSync(configPath)) {
            throw `config file ${configPath} not found.`
        } else {
            config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
        }
    } else {
        configPath = path.join(basePath, "pdcsc-config.json");

        if (fs.existsSync(configPath)) {
            config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
        } else {
            config = {}
        }
    }

    return { ...config, options: { RunOnPipline } }
}
async function initialize(config) {
    config = validateConfig(config, { server, user, password, databaseName });

    if (config.options.RunOnPipline) {
        if (config.pipeline == "gitlabs") {
            currentBranch = process.env.CI_COMMIT_REF_NAME.trim().replace("/", "-");
            realBranchName = process.env.CI_COMMIT_REF_NAME;
        } else if (config.pipeline == "azuredevops") {
            currentBranch = process.env.CI_COMMIT_REF_NAME.trim().replace("/", "-");
            realBranchName = process.env.CI_COMMIT_REF_NAME;
        }
        console.log(`Current Branch: ${realBranchName}`);
    } else {
        currentBranch = execSync("git rev-parse --abbrev-ref HEAD", { encoding: "utf-8" }).trim().replace("/", "-");
        realBranchName = execSync("git rev-parse --abbrev-ref HEAD", { encoding: "utf-8" }).trim();

    }

    if (!config.database.server) {
        throw `server not specified`
    }

    if (!config.database.user) {
        throw `user not specified`
    }

    if (!config.database.password) {
        throw `password not specified`
    }

    if (!config.database.databaseName) {
        throw `databaseName not specified`
    }

    server = config.database.server;
    user = config.database.user;
    password = config.database.password;
    databaseName = config.database.databaseName;

    moment.locale(timestampLocale);
    now = moment().format('jYYYYjMMjDDHHmmss');

    const { paths } = config;

    changesetPath = path.join(basePath, paths.changesetFolderName);
    appVersionFormat = paths.appVersionFormat;
    backupFile = path.join(paths.backupDir, `backup-${databaseName}-temp.bak`);
    timestampLocale = paths.timestampLocale;


    masterBranchName = paths.masterBranchName ?? 'origin/dev';

    credentials = `-S ${server} -U ${user} -P ${password}`;

    if (!config.options.RunOnPipline) {
        await compareWithDevBranch();
    }

    if (!changesetFile) {
        changesetFile = await generateFile();
    }
}
async function run(config) {
    const cleanFilename = path.parse(changesetFile).name
    const tempFileName = `${path.parse(changesetFile).name}~`;
    const changesetTempFile = `${path.parse(changesetFile).name}~.txt`;
    const changesetFilePath = path.join(changesetPath, `${cleanFilename}.txt`);
    const changesetTempFilePath = path.join(changesetPath, changesetTempFile);
    const tempScriptFilePath = path.join(changesetPath, `${cleanFilename}~.sql`);
    const scriptFilePath = path.join(changesetPath, `${cleanFilename}.sql`);

    if (!config.options.RunOnPipline) {
        if (fs.existsSync(changesetFilePath)) {
            validateChangeSetFile(changesetFilePath);

            const status = await git.status();
            do {
                if (status.modified.length > 0 || status.not_added.length > 0) {
                    console.warn(
                        "Warning: You have uncommitted changes. Only committed changes will be included in the script."
                    );

                    userChoice = await promptUser(
                        "Choose an option:\n1. Ignore changes and continue\n2. Commit changes and continue\n3. Show uncommitted changes.\n4. Cancel\nEnter your choice: "
                    );

                    if (userChoice === "1") {
                        console.log("Ignoring changes and continuing...");
                        break;
                    } else if (userChoice === "2") {
                        console.log("Committing changes...");
                        await git.add(".");
                        await git.commit("Auto-Commit before generating changeset.");
                        break;
                    } else if (userChoice === "3") {
                        const uncommittedChanges = [];
                        if (status.modified.length > 0) {
                            uncommittedChanges.push("Modified files:");
                            uncommittedChanges.push(...status.modified.map(file => `  - ${file}`));
                        }
                        if (status.not_added.length > 0) {
                            uncommittedChanges.push("Untracked files:");
                            uncommittedChanges.push(...status.not_added.map(file => `  - ${file}`));
                        }
                        if (status.deleted.length > 0) {
                            uncommittedChanges.push("Deleted files:");
                            uncommittedChanges.push(...status.deleted.map(file => `  - ${file}`));
                        }

                        if (uncommittedChanges.length > 0) {
                            console.log("Uncommitted changes:");
                            console.log(uncommittedChanges.join("\n"));
                        } else {
                            console.log("No uncommitted changes found.");
                        }
                    } else if (userChoice === "4") {
                        if (!fs.existsSync(scriptFilePath)) {
                            fs.unlinkSync(changesetFilePath);
                        };
                        console.log("Operation cancelled by the user.");
                        process.exit(0);
                    } else {
                        console.log("Invalid choice. Please enter a valid option.");
                    }
                } else {
                    console.log("No uncommitted changes detected.");
                    break;
                }
            } while (true);


            const modifiedFiles = getModifiedAndUntrackedFiles();
            const filteredFiles = modifiedFiles.filter((file) => isValidScriptFile(config, file));
            console.log("Filtered Modified Files:", filteredFiles);
            if (filteredFiles.length === 0) {
                console.log("No relevant modified files found.");
                process.exit(0);
            }

            const sections = categorizeFiles(filteredFiles);

            if (innerContent.length > 0) {
                changesetContent = fs.readFileSync(changesetFilePath, "utf-8");
            } else {

                changesetContent = generateChangesetContent(sections);
            }


            fs.writeFileSync(changesetTempFilePath, changesetContent.trim(), "utf-8");
            console.log(`Changeset written to ${changesetTempFilePath}`);

            const content = processChangeset(basePath, tempFileName) + `
    go
    ${getAppVersion()}
    go
            `;

            fs.writeFileSync(tempScriptFilePath, content, "utf-8");

            console.log(`Script written to: ${tempScriptFilePath}`);

            await backupAndRunScript(tempScriptFilePath, changesetTempFilePath, scriptFilePath, changesetFilePath, config.options.RunOnPipline);
        } else {
            console.log("Error: file not found!");
            process.exit(1);
        }
    } else {
        const changesetFileName = await getChangesetFile();
        const scriptFilePath = path.join(changesetPath, `${changesetFileName}`);

        await backupAndRunScript(scriptFilePath, "", "", "", config.options.RunOnPipline);
    }
}
async function main() {
    config = await validateCommandLineArgs();

    await initialize(config);

    await run(config);
}


/************ FUNCTIONS ************/
async function executeQuery(query, dbName, noCatch = true) {
    try {
        const pool = await sql.connect({
            user: user,
            password: password,
            server: server,
            database: dbName ?? databaseName,
            options: { encrypt: false }
        });
        result = await pool.request().query(query);
        await pool.close();

        return result.recordset;

    } catch (error) {
        if (noCatch) {
            throw error;
        }

        console.log("Error fetching database file Groups:", error);

        return false;
    }
}
async function executeBatch(content, dbName) {
    var parts = content.split(/\s*GO\s*/i);

    for (let part of parts) {
        await executeQuery(part, dbName);
    }
}
async function getFileGroups() {
    try {
        const pool = await sql.connect({
            user: user,
            password: password,
            server: server,
            database: databaseName,
            options: { encrypt: false }
        });
        const query = `
            SELECT
                db.name AS DBName,
                type_desc AS FileType,
                Physical_Name AS Location,
                mf.Name AS Name
            FROM
                sys.master_files mf
            INNER JOIN 
                sys.databases db ON db.database_id = mf.database_id
            WHERE db.name = '${databaseName}'
        `;
        result = await pool.request().query(query);
        await pool.close();

        return result.recordset;

    } catch (error) {
        console.log("Error fetching database file Groups:", error);
        process.exit(1);
    }
}

async function generateRestoreCommand() {
    try {
        const fileLocations = await getFileGroups();
        const moveClauses = fileLocations.map(file => {
            const newFileName = `${config.paths.backupDir}${backupDbName}_${file.Location.split("\\").pop()}`;
            return `MOVE '${file.Name}' TO '${newFileName}'`;
        });

        const moveString = moveClauses.join(", ");

        const restoreCommand = `use master; RESTORE DATABASE [${backupDbName}] FROM DISK='${backupFile}' WITH File = 1, ${moveString};`;
        return restoreCommand;
    } catch (error) {
        console.error("Error generating restore command:", err);
    }
}

async function getChangesetFile() {
    const changedFiles = await git.diff(['--name-only', masterBranchName, 'origin/' + realBranchName]);
    const changesetFile = changedFiles.split('\n').find(file => file.includes(currentBranch.replace("-", "_")));
    if (changesetFile) {
        const indexOfLastSlash = changesetFile.lastIndexOf('/');
        console.log(`Found changeset file: ${changesetFile.substring(indexOfLastSlash + 1)}`);
        return changesetFile.substring(indexOfLastSlash + 1);
    } else {
        console.log(`No changeset file found for branch '${currentBranch}'`);
        process.exit(1);
    }
}

async function compareWithDevBranch() {
    try {
        git.checkIsRepo((err, isRepo) => {
            if (err || !isRepo) {
                console.log('This is not a git repository.');
                process.exit(1);
            };
        });

        console.log("Fetching the latest updates from origin...");
        await git.fetch('origin', 'dev');

        const branches = await git.branch(['-r']);
        if (!branches.all.includes(`${masterBranchName}`)) {
            throw new Error(`Remote branch ${masterBranchName} does not exist.`);
        }

        const base = await git.raw(['merge-base', `${realBranchName}`, `${masterBranchName}`]);
        const log = await git.log({ from: base.trim(), to: `${masterBranchName}` });

        if (log.total > 0) {
            console.log(`Your branch '${realBranchName}' is behind ${masterBranchName} by ${log.total} commits.`);
            console.log(`Please run git pull ${masterBranchName} to sync with the latest changes.`);
            process.exit(1);
        }
    } catch (error) {
        console.error(`Error checking the ${masterBranchName} branch:`, error.message || error);
        process.exit(1);
    }
}

async function generateFile() {
    const fileContent = `
-- ===================== Custom-Start (start) ======================
-- ===================== Custom-Start ( end ) ======================

-- ===================== Types (start) ======================
-- ===================== Types ( end ) ======================

-- ===================== Tables (start) ======================
-- ===================== Tables ( end ) ======================

-- ===================== Relations (start) ======================
-- ===================== Relations ( end ) ======================

-- ===================== Functions (start) ======================
-- ===================== Functions ( end ) ======================

-- ===================== SPROCs (start) ======================
-- ===================== SPROCs ( end ) ======================

-- ===================== Custom-End (start) ======================
-- ===================== Custom-End ( end ) ======================
    `;

    try {
        const branch = (await git.branch()).current;
        const branchName = branch.replace("/", "_");

        const files = fs.readdirSync(changesetPath);
        let fileName;
        let fileExists = false;

        for (const file of files) {
            if (file.includes(branchName)) {
                fileExists = true;
                fileName = file;
                console.warn(`Changeset file already exists in ${changesetPath}${fileName}`);
                break;
            }
        }

        if (!fileExists) {
            fileName = `${now}_${branchName}.txt`;
            fs.writeFileSync(path.join(changesetPath, fileName), fileContent.trim());
            //await git.add(`${config.paths.changesetFolderName}/${fileName}`);
            //await git.commit(`Auto-Commit added ${fileName}.`);
        }

        return fileName;
    }
    catch (error) {
        console.error("Error generating file name:", error)
        process.exit(1);
    }
}

function promptUser(question) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            rl.close();
            resolve(answer.trim());
        });
    });
}

function getAppVersion() {
    const res = Timestamper({
        locale: `${timestampLocale}`,
        template: `${appVersionSporcTemplate}`,
        format: `${appVersionFormat}`,
        skipOutput: true
    });

    if (!res.success) {
        console.warn(`ts not generated successfully.`);
        console.warn(`${JSON.stringfy(res.err)}`);
    }
    return res.data;
}

function validateChangeSetFile(changesetFilePath) {
    const content = fs.readFileSync(changesetFilePath, "utf-8");

    const sections = [
        { name: "Types", start: "-- ===================== Types (start) ======================", end: "-- ===================== Types ( end ) ======================" },
        { name: "Tables", start: "-- ===================== Tables (start) ======================", end: "-- ===================== Tables ( end ) ======================" },
        { name: "Relations", start: "-- ===================== Relations (start) ======================", end: "-- ===================== Relations ( end ) ======================" },
        { name: "Functions", start: "-- ===================== Functions (start) ======================", end: "-- ===================== Functions ( end ) ======================" },
        { name: "SPROCs", start: "-- ===================== SPROCs (start) ======================", end: "-- ===================== SPROCs ( end ) ======================" }
    ];

    for (const section of sections) {
        if (!content.includes(section.start) || !content.includes(section.end)) {
            console.error(`Error: Section '${section.name}' not found.`);
            process.exit(1);
        }

        innerContent = content
            .split(section.start)[1]
            .split(section.end)[0]
            .trim();


        // if (innerContent.length > 0) {
        //     console.error(`Error: Section '${section.name}' is not empty.`);
        //     process.exit(1);
        // }
    }
}

function generateChangesetContent(sections) {
    return `
    -- ===================== Custom-Start (start) ======================
    -- ===================== Custom-Start ( end ) ======================
    
    -- ===================== Types (start) ======================
    ${sections.types.join("\n")}
    -- ===================== Types ( end ) ======================
    
    -- ===================== Tables (start) ======================
    ${sections.tables.join("\n")}
    -- ===================== Tables ( end ) ======================
    
    -- ===================== Relations (start) ======================
    ${sections.relations.join("\n")}
    -- ===================== Relations ( end ) ======================
    
    -- ===================== Functions (start) ======================
    ${sections.functions.join("\n")}
    -- ===================== Functions ( end ) ======================
    
    -- ===================== SPROCs (start) ======================
    ${sections.procedures.join("\n")}
    -- ===================== SPROCs ( end ) ======================
    
    -- ===================== Views (start) ======================
    ${sections.views.join("\n")}
    -- ===================== Views ( end ) ======================
    
    -- ===================== Indexes (start) ======================
    ${sections.indexes.join("\n")}
    -- ===================== Indexes ( end ) ======================
    
    -- ===================== Triggers (start) ======================
    ${sections.triggers.join("\n")}
    -- ===================== Triggers ( end ) ======================
    
    -- ===================== Custom-End (start) ======================
    -- ===================== Custom-End ( end ) ======================
    `
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

    const subdir = segments[1].toLowerCase()

    return subdir.includes('procedures') ||
        subdir.includes('functions') ||
        subdir.includes('schemas') ||
        subdir.includes('types') ||
        subdir.includes('indexes') ||
        subdir.includes('tables') ||
        subdir.includes('relations') ||
        subdir.includes('triggers') ||
        subdir.includes('views')
}

function categorizeFiles(filteredFiles) {
    const sections = {
        procedures: [],
        functions: [],
        tables: [],
        relations: [],
        types: [],
        views: [],
        indexes: [],
        triggers: [],
        schemas: []
    };

    const folders = {
        procedures: "07-Procedures",
        functions: "04-Functions",
        tables: "03-Tables",
        relations: "08-Relations",
        types: "02-Types",
        views: "06-Views",
        indexes: "09-Indexes",
        triggers: "05-Triggers",
        schemas: "01-Schemas"
    };

    filteredFiles.forEach((file) => {
        let fileName = path.basename(file);

        if (fileName.toLowerCase().startsWith("dbo.")) {
            fileName = fileName.substring(4);
        }

        for (const [section, folder] of Object.entries(folders)) {
            if (file.includes(`Scripts/${folder}/`)) {
                sections[section].push(fileName);
                return;
            }
        }

        console.warn(`File '${file}' does not belong to any known section.`);
    });

    return sections;
}

function getModifiedAndUntrackedFiles() {
    try {
        const mergeBase = execSync(
            `git merge-base HEAD origin/dev`,
            { encoding: "utf-8" }
        ).trim();

        console.log(`Current Branch: ${currentBranch}`);
        console.log(`Merge Base: ${mergeBase}`);

        const modifiedFiles = execSync(
            `git diff --name-only --diff-filter=MA ${mergeBase} HEAD`,
            { encoding: "utf-8" }
        )
            .split("\n")
            .map((file) => file.trim())
            .filter((file) => file);

        const untrackedFiles = execSync(
            "git ls-files --others --exclude-standard",
            { encoding: "utf-8" }
        )
            .split("\n")
            .map((file) => file.trim())
            .filter((file) => file);

        const allFiles = [...modifiedFiles, ...untrackedFiles];
        return allFiles;
    } catch (error) {
        console.error("Error fetching modified and untracked files:", error.message);
        process.exit(1);
    }
}

async function backupAndRunScript(tempScript, temptxtfile, scriptFile, txtFile, RunOnPipline) {
    try {
        const restoreCommand = await generateRestoreCommand();

        // Step 1: Create database
        console.log("Creating database backup...");
        await executeQuery(`BACKUP DATABASE [${databaseName}] TO DISK='${backupFile}' WITH INIT`);
        //execSync(`sqlcmd ${credentials} -Q "BACKUP DATABASE [${databaseName}] TO DISK='${backupFile}' WITH INIT"`);
        console.log(`Database backup created at: ${backupFile}`);

        // Step 2: Restore database
        console.log("Restoring backup to temporary database...");
        await executeQuery(restoreCommand);
        console.log(`Backup restored as: ${backupDbName}`);

        // Step 3: Execute script on backup database
        console.log("Executing script on temporary database...");
        const tempScriptContent = fs.readFileSync(tempScript, "utf-8");
        await executeBatch(tempScriptContent);
        //execSync(`sqlcmd ${credentials} -b -d ${backupDbName} -i "${tempScript}"`, { stdio: "inherit" });
        console.log(`Script executed successfully on database: ${backupDbName}`);

        if (RunOnPipline) {
            // Step 4: Execute script on Master DB
            console.log("Executing script on master database...");
            const tempScriptContent = fs.readFileSync(tempScript, "utf-8");
            await executeBatch(tempScriptContent, databaseName);
            //await executeQuery(`${credentials} -b -d ${databaseName} -i "${tempScript}"`);
            //execSync(`sqlcmd ${credentials} -b -d ${databaseName} -i "${tempScript}"`, { stdio: "inherit" });
            console.log(`Script executed successfully on database: ${databaseName}`);
        }

        // Step 5: Save script 
        if (!RunOnPipline) {
            fs.renameSync(tempScript, scriptFile);
            fs.renameSync(temptxtfile, txtFile);
            console.log(`Script saved at: ${scriptFile}`);
        }

        if (userChoice === "2") {
            await git.add(".");
            await git.commit("Auto-Commit after generating changeset.")
        }

        // Step 6: Remove database and tempfile
        await executeQuery(`DROP DATABASE [${backupDbName}]`);
        //execSync(`sqlcmd ${credentials} -Q "DROP DATABASE [${backupDbName}]"`);
        console.log(`Temporary database ${backupDbName} dropped successfully.`);

    } catch (error) {
        console.error("Error during script execution:", error.message);
        const logFile = path.join(changesetPath, "error.log");
        fs.writeFileSync(logFile, error.message, "utf-8");
        console.error(`Error log written to: ${logFile}`);
        await executeQuery(`IF EXISTS (SELECT name FROM sys.databases WHERE name = '${backupDbName}') DROP DATABASE [${backupDbName}]`);
        //execSync(`sqlcmd ${credentials} -Q "IF EXISTS (SELECT name FROM sys.databases WHERE name = '${backupDbName}') DROP DATABASE [${backupDbName}]"`, { stdio: "ignore" });
    } finally {
        // Remove temp script file
        if (!RunOnPipline) {
            if (fs.existsSync(tempScript)) fs.unlinkSync(tempScript);
            if (fs.existsSync(temptxtfile)) fs.unlinkSync(temptxtfile);
            if (fs.existsSync(backupFile)) fs.unlinkSync(backupFile);
        }
    }
}

/************ END FUNCTIONS ************/

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
