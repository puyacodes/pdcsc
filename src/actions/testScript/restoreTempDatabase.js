import generateRestoreCommand from "./generateRestoreCommand.js";

async function restoreTempDatabase(config) {
    const { db, backupDbName } = config;

    console.log("Restoring backup to temporary database...");

    const restoreCommand = await generateRestoreCommand(config);

    await db.executeQuery({ query: restoreCommand });

    config.debug(`Backup restored as: ${backupDbName}`);
}

export default restoreTempDatabase;