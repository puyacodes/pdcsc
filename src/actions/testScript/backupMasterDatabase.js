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

export default backupMasterDatabase;