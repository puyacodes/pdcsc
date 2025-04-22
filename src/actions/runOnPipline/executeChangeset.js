import { Exception } from "@locustjs/exception";
import chalk from "chalk";

async function executeChangeset(config, changeset) {
    let error;
    const { db } = config;
    const { database } = config.database;

    try {
        console.log(`Executing changeset on ${chalk.magenta(database)} database ...`);

        await db.executeBatch({ content: changeset });

        console.log(`Script executed successfully`);
    } catch (ex) {
        error = new Exception(`executing changeset on ${database} failed`, ex);

        if (ex instanceof ExecuteQueryException) {
            config.debug5(`\n${ex.query}\n`);
        }
    }

    return error;
}

export default executeChangeset