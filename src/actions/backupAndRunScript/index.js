import fs from "fs";
import path from "path";
import { ExecuteQueryException } from "../../services/DbHelper/exceptions/index.js";
import generateRestoreCommand from "./generateRestoreCommand.js";
import dropTempDb from "./dropTempDb.js";

async function backupAndRunScript(config, script) {
    const { database, db, backupDbName, paths } = config;
    const { changesetsPath } = config.paths;
    const dbName = database.database
    let error;

    try {
        // Step 1: Create database
        console.log("Creating database backup...");

        await db.executeQuery({
            query: `BACKUP DATABASE [${dbName}] TO DISK = '${paths.backupFile}' WITH INIT`
        });

        config.debug(`Database backup created at: ${paths.backupFile}`);

        // Step 2: Restore database
        console.log("Restoring backup to temporary database...");

        const restoreCommand = await generateRestoreCommand(config);

        await db.executeQuery({ query: restoreCommand });

        config.debug(`Backup restored as: ${backupDbName}`);
        
        // Step 3: Execute script on backup database
        console.log("Executing script on temporary database...");

        await db.executeBatch({ content: script });

        if (config.debugMode) {
            console.log(`Script executed successfully on database: ${backupDbName}`);
        } else {
            console.log(`Script executed successfully on temp database.`);
        }

        // Step 4: Remove database and tempfile
        // this is done in finally
    } catch (ex) {
        error = ex;
        console.error("Error during script execution:", error);

        const logFile = path.join(changesetsPath, "error.log");

        try {
            fs.writeFileSync(logFile, "", "utf-8");

            try {
                fs.appendFileSync(logFile, JSON.stringify(error, null, 4) + "\n\n", "utf-8");

                if (error instanceof ExecuteQueryException) {
                    fs.appendFileSync(logFile, error.query + "\n\n", "utf-8");

                    error.query = null;
                }
            } catch (e) {
                let msg = ex.message ? ex.message: ex;
                fs.appendFileSync(logFile, msg + "\n\n", "utf-8");

                msg = e.message ? e.message: e;
                fs.appendFileSync(logFile, msg + "\n\n", "utf-8");

                fs.appendFileSync(logFile, error.message, "utf-8");
            }

            console.error(`Error log written to: ${logFile}`);
        } catch (error) {
            console.error(`Error creating log file: ${logFile}`);
        }
    } finally {
        await dropTempDb(config);
    }

    return error;
}

export default backupAndRunScript;