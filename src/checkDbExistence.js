function checkDbExistence(config) {
    if (!config.cliMode) {
        config.db.dbExists(config.database.database);
    }
}


export default checkDbExistence;