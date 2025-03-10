import { Exception } from "@locustjs/exception";

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

export default dropTempDb;