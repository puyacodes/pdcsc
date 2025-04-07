async function dropTempDb(config) {
    const { db, backupDbName } = config;
    let error;

    try {
        config.debug(`Dropping temporary database ...`);
        
        const query = `IF EXISTS(SELECT name FROM sys.databases WHERE name = '${backupDbName}')
            DROP DATABASE[${backupDbName}]`;

        config.debug2(query);

        await db.executeQuery({ query });
    } catch (ex) {
        config.debug(`Dropping temporary database failed.`);

        error = ex;
    }

    if (!error) {
        config.debug(`Temporary database dropped successfully.`);
    }

    return error;
}

export default dropTempDb;