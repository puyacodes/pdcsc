import chalk from "chalk";

async function checkDbExistence(config) {
    let result = false;

    config.debug(`Checking master database ${chalk.magenta(config.database.database)} ...`)

    if (!config.cliMode) {
        try {
            await config.db.dbExists(config.database.database);

            config.debug(`database exists`)

            result = true
        } catch (ex) {
            console.error(chalk.red(`Master database does not exist or cannot check its existence.
Operation aborted.`));
            config.debug(ex);
        }
    } else {
        result = true;
    }

    return result;
}


export default checkDbExistence;