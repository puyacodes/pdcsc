import fs from "fs";
import path from "path";
import { ExecuteQueryException } from "../../services/DbHelper/exceptions/index.js";
import generateRestoreCommand from "./generateRestoreCommand.js";
import { Exception } from "@locustjs/exception";

async function backupMasterDatabase(config) {
    const { database, db, paths } = config;
    const { backupFile } = paths;
    const dbName = database.database

    console.log("Creating database backup...");

    await db.executeQuery({
        query: `BACKUP DATABASE [${dbName}] TO DISK = '${backupFile}' WITH INIT`
    });

    config.debug(`Database backup created at: ${backupFile}`);
}
async function restoreTempDatabase(config) {
    const { db, backupDbName } = config;

    console.log("Restoring backup to temporary database...");

    const restoreCommand = await generateRestoreCommand(config);

    await db.executeQuery({ query: restoreCommand });

    config.debug(`Backup restored as: ${backupDbName}`);
}
async function executeScript(config, script) {
    const { db, backupDbName } = config;

    console.log("Executing script on temporary database...");

    await db.executeBatch({ content: script, dbName: backupDbName });

    console.log(`Script executed successfully on temp database.`);
}
function createErrorLog(config, ex) {
    const { paths } = config;
    const { changesetsPath } = paths;
    const { query } = ex;
    let error;

    if (ex instanceof ExecuteQueryException) {
        ex.query = null;
    }

    const logFile = path.join(changesetsPath, "error.log");
    
    error = new Exception(`Error during script execution. see '${logFile}' for more details.`, ex);

    try {
        fs.writeFileSync(logFile, "", "utf-8");

        try {
            fs.appendFileSync(logFile, JSON.stringify(ex, null, 4) + "\n\n", "utf-8");
        } catch (e) {
            let msg = e.message ? e.message : e;

            fs.appendFileSync(logFile, msg + "\n\n", "utf-8");

            msg = ex.message ? ex.message : ex;

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

        error = new Exception(msg, ex)
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
async function testScript(config, script) {
    let error;

    try {
        await backupMasterDatabase(config)
        await restoreTempDatabase(config);
        await executeScript(config, script);
    } catch (ex) {
        error = createErrorLog(config, ex);
    } finally {
        error = await dropTempDb(config);
    }

    return error;
}

export default testScript;