function checkDbExistence(config) {
    return config.db.dbExists(config.database.database);
}


export default checkDbExistence;