import chalk from "chalk";

async function backupMasterDatabase(config) {
    const { database, db, paths } = config;
    const { backupFile } = paths;
    const dbName = database.database

    config.debug("Creating database backup...");

    const query = `BACKUP DATABASE [${dbName}] TO DISK = '${backupFile}' WITH INIT`;

    config.debug2(query);

    await db.executeQuery({ query });

    config.debug(`Database backup created: ${chalk.cyan(backupFile)}`);
}

export default backupMasterDatabase;