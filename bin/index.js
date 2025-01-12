#!/usr/bin/env node
const { processChangeset } = require("./ProcessChangeset.js");
const readline = require("readline");
const fs = require("fs");
const path = require("path");
const simpleGit = require("simple-git");
const { execSync } = require("child_process");
const {Timestamper} = require('@puya/ts');
const moment = require("jalali-moment");
const sql = require("mssql");

const configPath = path.join(__dirname, "config.json");

if (!fs.existsSync(configPath)) {
    console.error("Error: Configuration file not found!");
    process.exit(1);
}
const now = moment().format('jYYYYjMMjDDHHmmss');
const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
const {database, paths} = config;
const currentPath = process.cwd();
const basePath = paths.basePath ?? currentPath;
const changesetPath = path.join(basePath, "/Changes/");
const backupDir = paths.backupDir;
const git = simpleGit();
const currentBranch = execSync("git rev-parse --abbrev-ref HEAD", { encoding: "utf-8" }).trim().replace("/","-");
const backupFile = path.join(
    backupDir,
    `backup-${currentBranch}-${now}.bak`
);
const appVersionFormat = paths.appVersionFormat;
const changesetFolderName = paths.changesetFolderName;
let server = database.server;
let user = database.user;
let password = database.password;
let credentials = `-S ${server} -U ${user} -P ${password}`;
let databaseName = database.databaseName;
const backupDbName = 'TempBackupDB'; 
const timestampLocale = paths.timestampLocale;
const masterBranchName = paths.masterBranchName ?? 'origin/dev';
const appVersionSporcTemplate = `create or alter proc dbo.getAppVersion as select '{ts}'`;
let userChoice;
let innerContent;
let changesetContent;
let changesetFile;


async function main() {
    
    const args = process.argv.slice(2);

    const RunOnPipline = args.includes("-rop") ? true : false;
    const RunOnMaster = args.includes("-rom") || RunOnPipline ? true : false;
    const changesetFileArgIndex = args.indexOf("-csf");
    if (changesetFileArgIndex !== -1 && args[changesetFileArgIndex + 1]) {
        changesetFile = args[changesetFileArgIndex + 1];
    } else {
        changesetFile = await generateFile();
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
    if (databaseNameArgIndex !== -1 && args[databaseNameArgIndex + 1]){
        databaseName = args[databaseNameArgIndex + 1];
    }
    
    credentials = `-S ${server} -U ${user} -P ${password}`;
    
    await compareWithDevBranch(RunOnPipline);
    if (RunOnPipline) {
        await getChangesetFile();
    }  

    const cleanFilename = args[0] ? path.parse(changesetFile).name : changesetFile.substring(0, changesetFile.indexOf("."));
    const tempFileName = `${path.parse(changesetFile).name}~`;
    const changesetTempFile = `${path.parse(changesetFile).name}~.txt`;
    const changesetFilePath = path.join(changesetPath, `${cleanFilename}.txt`);
    const changesetTempFilePath = path.join(changesetPath, changesetTempFile);
    const tempScriptFilePath = path.join(changesetPath, `${cleanFilename}~.sql`);
    const scriptFilePath = path.join(changesetPath, `${cleanFilename}.sql`);
    
    if (!RunOnPipline) {
        if (fs.existsSync(changesetFilePath)) {
            validateChangeSetFile(changesetFilePath);
    
            if (innerContent.length > 0) {
                changesetContent = fs.readFileSync(changesetFilePath, "utf-8");
            } 
            else 
            {
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
                            fs.unlinkSync(changesetFilePath);
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
                const filteredFiles = modifiedFiles.filter((file) => isValidScriptFile(file));
                console.log("Filtered Modified Files:", filteredFiles);
                if (filteredFiles.length === 0) {
                    console.log("No relevant modified files found.");
                    process.exit(0);
                }
                
                const sections = categorizeFiles(filteredFiles);
            
                changesetContent = generateChangesetContent(sections);
            } 
    
            fs.writeFileSync(changesetTempFilePath, changesetContent.trim(), "utf-8");
            console.log(`Changeset written to ${changesetTempFilePath}`);
        
            const content = processChangeset(basePath, tempFileName) + `
    go
    ${getWebVersion()}
    go
            `;
    
            fs.writeFileSync(tempScriptFilePath, content, "utf-8");
    
            console.log(`Script written to: ${tempScriptFilePath}`);
    
            backupAndRunScript(tempScriptFilePath, changesetTempFilePath, scriptFilePath, changesetFilePath, RunOnMaster, RunOnPipline);
        } else {
            console.log("Error: file not found!");
            process.exit(1);
        }
    }
}


/************ FUNCTIONS ************/
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
                Physical_Name AS Location
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
        const newFileName = `${backupDir}${backupDbName}_${file.Location.split("\\").pop()}`;
        return `MOVE '${file.Location.split("\\").pop()}' TO '${newFileName}'`;
        });

        const moveString = moveClauses.join(", ");

        const restoreCommand = `
            sqlcmd -S ${server} -U ${user} -P ${password} -Q "RESTORE DATABASE [${backupDbName}] FROM DISK='${backupFile}' 
            WITH ${moveString}, NOUNLOAD, STATS = 5;"
        `;
        return restoreCommand;
    } catch (error) {
        console.error("Error generating restore command:", err);
    }
}

async function getChangesetFile () {
    const changedFiles = await git.diff(['--name-only', masterBranchName, currentBranch.replace("-", "/")]);
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

async function compareWithDevBranch (RunOnPipline) {
    try {
        git.checkIsRepo((err, isRepo) => {
            if (err || !isRepo) {
              console.log('This is not a git repository.');
              process.exit(1);
            };
        });

        if (!RunOnPipline) {
            console.log("Fetching the latest updates from origin...");
            await git.fetch('origin', 'dev');   
        }

        const branches = await git.branch(['-r']);
        if (!branches.all.includes(`${masterBranchName}`)) {
          throw new Error(`Remote branch ${masterBranchName} does not exist.`);
        }

        const base = await git.raw(['merge-base', `${currentBranch.replace("-", "/")}`, `${masterBranchName}`]);
        const log = await git.log({ from: base.trim(), to: `${masterBranchName}` });

        if (log.total > 0) {
            console.log(`Your branch '${currentBranch.replace("-", "/")}' is behind ${masterBranchName} by ${log.total} commits.`);
            console.log(`Please run git pull ${masterBranchName} to sync with the latest changes.`);
            process.exit(1);
        } 
    } catch (error) {
        console.error(`Error checking the ${masterBranchName} branch:`, error.message || error);
        process.exit(1);
    }
}

async function generateFile () {
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
            //await git.add(`${changesetFolderName}/${fileName}`);
            //await git.commit(`Auto-Commit added ${fileName}.`);
        }
    
        return fileName;
    }
    catch (error) {
        console.error("Error generating file name:", error)
        process.exit(1);
    }
}

function promptUser (question) {
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

function getWebVersion () {
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

function validateChangeSetFile (changesetFilePath) {
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

function generateChangesetContent (sections) {
    return  `
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

function isValidScriptFile(file) {
    const validFolders = [
        "Scripts/07-Procedures/",
        "Scripts/04-Functions/",
        "Scripts/03-Tables/",
        "Scripts/08-Relations/",
        "Scripts/02-Types/",
        "Scripts/06-Views/",
        "Scripts/09-Indexes/",
        "Scripts/05-Triggers/",
        "Scripts/01-Schemas/"
    ];

    return validFolders.some((folder) => file.startsWith(folder));
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

async function backupAndRunScript(tempScript, temptxtfile, scriptFile, txtFile, RunOnMaster, RunOnPipline) {
    try {
        const restoreCommand = await generateRestoreCommand();
        if (innerContent == 0 || RunOnPipline) {
            // Step 1: Create database
            console.log("Creating database backup...");
            execSync(`sqlcmd ${credentials} -Q "BACKUP DATABASE [${databaseName}] TO DISK='${backupFile}'"`);
            console.log(`Database backup created at: ${backupFile}`);

            // Step 2: Restore database
            console.log("Restoring backup to temporary database...");
            execSync(
                `${restoreCommand}`
            );
            console.log(`Backup restored as: ${backupDbName}`);

            // Step 3: Execute script on backup database
            console.log("Executing script on temporary database...");
            console.log()
            execSync(`sqlcmd ${credentials} -b -d ${backupDbName} -i "${tempScript}"`, { stdio: "inherit" });
            console.log(`Script executed successfully on database: ${backupDbName}`);

            if (RunOnMaster) {
                // Step 4: Execute script on Master DB
                console.log("Executing script on master database...");
                execSync(`sqlcml ${credentials} -b -d ${databaseName} -i "${tempScript}"`, { stdio: "inherit" });
                console.log(`Script executed successfully on database: ${databaseName}`);    
            }
        }
       
        // Step 5: Save script 
        if(!RunOnPipline) {
            fs.renameSync(tempScript, scriptFile);
            fs.renameSync(temptxtfile, txtFile);
            console.log(`Script saved at: ${scriptFile}`);
        }

        if (userChoice === "2") {
            await git.add(".");
            await git.commit("Auto-Commit after generating changeset.")
        }

        // Step 6: Remove database and tempfile
        execSync(`sqlcmd ${credentials} -Q "DROP DATABASE [${backupDbName}]"`);
        console.log(`Temporary database ${backupDbName} dropped successfully.`);

    } catch (error) {
        console.error("Error during script execution:", error.message);

        if (!RunOnPipline) {
            const logFile = path.join(changesetPath, "error.log");
            fs.writeFileSync(logFile, error.message, "utf-8");
            console.error(`Error log written to: ${logFile}`);
        }

        execSync(`sqlcmd ${credentials} -Q "IF EXISTS (SELECT name FROM sys.databases WHERE name = '${backupDbName}') DROP DATABASE [${backupDbName}]"`, { stdio: "ignore" });
    } finally {
        // Remove temp script file
        if (!RunOnPipline) {
            if (fs.existsSync(tempScript)) fs.unlinkSync(tempScript);
            if (fs.existsSync(temptxtfile)) fs.unlinkSync(temptxtfile);
        }
    }
}

/************ END FUNCTIONS ************/

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
