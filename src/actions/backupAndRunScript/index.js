import fs from "fs";
import path from "path";
import { ExecuteQueryException } from "../../services/DbHelper/exceptions/index.js";
import generateRestoreCommand from "../../startup/generateRestoreCommand.js";
import restoreCommitedChanges from "../../utils/restoreCommitedChanges.js";
import { BackupAndRunException } from "../../exceptions/index.js";
import FileHelper from "../../services/FileHelper/index.js";
import simpleGit from "simple-git";

async function backupAndRunScript(props) {
    const { config } = props;
    const { settings, database, db, backupDbName } = config;
    const databaseName = database.databaseName
    let afterCommit = false;
    let error;

    try {
        const restoreCommand = await generateRestoreCommand(config);

        // Step 1: Create database
        console.log("Creating database backup...");

        await db.executeQuery({
            query: `BACKUP DATABASE[${databaseName}]TO DISK = '${settings.backupFile}' WITH INIT`
        });

        if (config.debugMode) {
            console.log(`Database backup created at: ${settings.backupFile}`);
        }

        // Step 2: Restore database
        console.log("Restoring backup to temporary database...");

        await db.executeQuery({ query: restoreCommand });

        if (config.debugMode) {
            //tempScripttemptxtfile
            console.log(`Backup restored as: ${backupDbName}`);
        }

        // Step 3: Execute script on backup database
        console.log("Executing script on temporary database...");
        
        const tempScriptContent = fs.readFileSync(props.tempScript, "utf-8");

        await db.executeBatch({ content: tempScriptContent });

        if (config.debugMode) {
            console.log(`Script executed successfully on database: ${backupDbName}`);
        } else {
            console.log(`Script executed successfully on temp database.`);
        }

        // Step 5: Save script 
        fs.renameSync(props.tempScript, props.scriptFile);
        fs.renameSync(props.temptxtfile, props.txtFile);

        console.log(`Script saved at: ${props.scriptFile}`);

        // Step 6: Remove database and tempfile
        await dropTempDb(props.config);

        // Step 7: Commit changeset files
        await commitChanges([props.txtFile, props.scriptFile]);

        afterCommit = true;


    } catch (ex) {
        error = ex;
        console.error("Error during script execution:", error.message);

        const logFile = path.join(settings.changesetPath, "error.log");

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

        await db.executeQuery({
            query: `IF EXISTS(SELECT name FROM sys.databases WHERE name = '${backupDbName}') DROP DATABASE[${props.backupDbName}]`,
        });

    } finally {
        // Remove temp script file
        FileHelper.deleteFiles(props.tempScript, props.temptxtfile, settings.backupFile, props.tempScript);
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

        await git.commit("pdcsc: changeset created.");
    } catch (error) {
        throw new Error(`Error during commiting changes: ${error}`);
    }
}

async function dropTempDb(config) {
    const { db } = config;

    await db.executeQuery({ query: `DROP DATABASE[${backupDbName}]` });

    if (config.debugMode) {
        console.log(`Temporary database ${backupDbName} dropped successfully.`);
    } else {
        console.log(`Temporary database dropped successfully.`);
    }
}


export default backupAndRunScript;