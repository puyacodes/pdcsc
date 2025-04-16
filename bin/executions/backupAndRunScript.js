const fs = require("fs");
const path = require("path");
const { executeBatch } = require("./executeBatch.js");
const { executeQuery } = require("./executeQuery.js");
const { ExecuteQueryException } = require("../exceptions/ExecuteQueryException.js");
const { generateRestoreCommand } = require("../startup/generateRestoreCommand.js");
const simpleGit = require("simple-git");
const { restoreCommitedChanges } = require("../utils/restoreCommitedChanges.js");
const { BackupAndRunException } = require("../exceptions/BackupAndRunException.js");

async function backupAndRunScript(props) {
    const databaseName = props.config.database.databaseName
    let afterCommit = false;
    let error;
    try {
        const restoreCommand = await generateRestoreCommand({
            config: props.config,
            backupFile: props.defaults.backupFile,
            backupDbName: props.backupDbName
        });

        // Step 1: Create database
        console.log("Creating database backup...");
        await executeQuery({
            query: `BACKUP DATABASE[${databaseName}]TO DISK = '${props.defaults.backupFile}' WITH INIT`,
            config: props.config
        });
        if (props.config.options.debugMode) {
            console.log(`Database backup created at: ${props.defaults.backupFile}`);
        }

        // Step 2: Restore database
        console.log("Restoring backup to temporary database...");
        await executeQuery({ query: restoreCommand, config: props.config });
        if (props.config.options.debugMode) {
            //tempScripttemptxtfile
            console.log(`Backup restored as: ${props.backupDbName}`);
        }

        // Step 3: Execute script on backup database
        console.log("Executing script on temporary database...");
        const tempScriptContent = fs.readFileSync(props.tempScript, "utf-8");
        await executeBatch({ content: tempScriptContent, dbName: props.backupDbName, config: props.config });
        if (props.config.options.debugMode) {
            console.log(`Script executed successfully on database: ${props.backupDbName}`);
        } else {
            console.log(`Script executed successfully on temp database.`);
        }

        // Step 5: Save script 
        fs.renameSync(props.tempScript, props.scriptFile);
        fs.renameSync(props.temptxtfile, props.txtFile);
        console.log(`Script saved at: ${props.scriptFile}`);

        // Step 6: Remove database and tempfile
        await dropTempDb(props.backupDbName, props.config);

        // Step 7: Commit changeset files
        await commitChanges([props.txtFile, props.scriptFile]);
        afterCommit = true;


    } catch (ex) {
        error = ex;
        console.error("Error during script execution:", error.message);
        const logFile = path.join(props.defaults.changesetPath, "error.log");

        try {
            fs.writeFileSync(logFile, "", "utf-8");
            try {
                fs.appendFileSync(logFile, JSON.stringify(error, null, 4) + "\n\n", "utf-8");

                if (error instanceof ExecuteQueryException) {
                    fs.appendFileSync(logFile, error.query + "\n\n", "utf-8");
                    error.query = null;
                }
            } catch (ex) {
                fs.appendFileSync(logFile, ex.message + "\n\n", "utf-8");
                fs.appendFileSync(logFile, error.message, "utf-8");
            }
            console.error(`Error log written to: ${logFile}`);
        } catch (error) {
            console.error(`Error creating log file: ${logFile}`);
        }

        await executeQuery({
            query: `IF EXISTS(SELECT name FROM sys.databases WHERE name = '${props.backupDbName}') DROP DATABASE[${props.backupDbName}]`,
            config: props.config
        });

    } finally {
        // Remove temp script file
        if (fs.existsSync(props.tempScript)) fs.unlinkSync(props.tempScript);
        if (fs.existsSync(props.temptxtfile)) fs.unlinkSync(props.temptxtfile);
        if (fs.existsSync(props.defaults.backupFile)) fs.unlinkSync(props.defaults.backupFile);
        if (fs.existsSync(props.tempScript)) fs.unlinkSync(props.tempScript)
    }

    if (error) {
        if (props.userChoice === "2" && afterCommit) {
            restoreCommitedChanges(2);
        } else if (props.userChoice === "2" || afterCommit) {
            restoreCommitedChanges();
        }
        throw new BackupAndRunException(error);
    }
}


/* FUNCTIONS */
async function commitChanges(files) {
    const git = simpleGit();
    try {
        for (let file of files) {
            await git.add(file);
        }
        await git.commit("Auto-Commit after generating changeset.");
    } catch (error) {
        throw new Error(`Error during commiting changes: ${error}`);
    }
}
async function dropTempDb(backupDbName, config) {
    await executeQuery({ query: `DROP DATABASE[${backupDbName}]`, config });
    if (config.options.debugMode) {
        console.log(`Temporary database ${backupDbName} dropped successfully.`);
    } else {
        console.log(`Temporary database dropped successfully.`);
    }
}


module.exports = { backupAndRunScript };