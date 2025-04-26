import chalk from "chalk";

async function checkDbExistence(config) {
    let result = false;
    
    if (!config.cliMode) {
        config.debug(`Checking database ${chalk.magenta(config.database.database)} existence ...`)

        try {
            await config.db.dbExists(config.database.database);

            config.debug(`database exists`);

            result = true
        } catch (ex) {
            config.error = ex;
        }
    } else {
        result = true;
    }

    return result;
}


export default checkDbExistence;