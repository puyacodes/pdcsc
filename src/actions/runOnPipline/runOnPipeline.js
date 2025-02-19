import fs from "fs";
import path from "path";
import { ExecuteQueryException } from "../../services/DbHelper/exceptions";
import generateRestoreCommand from "../../startup/generateRestoreCommand.js";
import { BackupAndRunException } from "../../exceptions";

async function runOnPipeline(config, scriptFilePath) {
    const { db, backupDbName } = config;
    const { database } = config.database;
    const tempScriptContent = fs.readFileSync(scriptFilePath, "utf-8");
    let error;

    try {
        const restoreCommand = await generateRestoreCommand(config);

        // Step 1: Create database
        console.log("Creating database backup...");

        await db.executeQuery({
            query: `BACKUP DATABASE[${database}]TO DISK = '${config.settings.backupFile}' WITH INIT`,
        });

        if (config.debugMode) {
            console.log(`Database backup created at: ${config.settings.backupFile}`);
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

        await db.executeBatch({ content: tempScriptContent });

        if (config.debugMode) {
            console.log(`Script executed successfully on database: ${backupDbName}`);
        } else {
            console.log(`Script executed successfully on temp database.`);
        }

        // Step 4: Execute script on Master DB
        console.log(`Executing script on ${database} database...`);

        await db.executeBatch({ content: tempScriptContent });

        console.log(`Script executed successfully on database: ${database}`);

        // Step 5: Remove database and tempfile
        await dropTempDb(props.config);
    } catch (ex) {
        error = ex;
        console.error("Error during executing script on pipeline:", error.message);

        const logFile = path.join(changesetPath, "error.log");

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
            query: `IF EXISTS(SELECT name FROM sys.databases WHERE name = '${backupDbName}') DROP DATABASE[${backupDbName}]`,
        });

    }

    if (error) {
        throw new BackupAndRunException(error);
    }
}


export default runOnPipeline;