import createErrorLog from "../../utils/createErrorLog.js";
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