async function checkDbExistence(config) {
    let result = false;

    config.debug2(`checking if database ${config.database.database} exists ...`)

    if (!config.cliMode) {
        try {
            await config.db.dbExists(config.database.database);

            config.debug2(`database ${config.database.database} exists`)

            result = true
        } catch (ex) {
            config.debug2(ex)
        }
    } else {
        result = true;
    }

    return result;
}


export default checkDbExistence;