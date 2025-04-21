async function dropTempDb(config) {
    const { db, backupDbName } = config;
    let error;

    try {
        config.debug(`Dropping temporary database ...`);
        
        const query = `IF EXISTS(SELECT name FROM sys.databases WHERE name = '${backupDbName}')
            DROP DATABASE[${backupDbName}]`;

        config.debug4(query);

        await db.executeQuery({ query });

        config.debug(`Temporary database dropped successfully.`);
    } catch (ex) {
        config.debug(`Dropping temporary database failed.\n\t${ex.toString()}`);

        error = ex;
    }

    return error;
}

export default dropTempDb;