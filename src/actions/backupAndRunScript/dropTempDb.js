async function dropTempDb(config) {
    const { db, backupDbName } = config;

    await db.executeQuery({
        query: `IF EXISTS(SELECT name FROM sys.databases WHERE name = '${backupDbName}')
        DROP DATABASE[${backupDbName}]`
    });

    if (config.debugMode) {
        console.log(`Temporary database ${backupDbName} dropped successfully.`);
    } else {
        console.log(`Temporary database dropped successfully.`);
    }
}

export default dropTempDb;