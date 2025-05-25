import { Exception } from "@locustjs/exception";
import chalk from "chalk";
import formatDate from "../../utils/formatDate";

async function getFirstExecutedChangeset(config) {
    const { db, changesetsTableName } = config;

    let result;

    console.log("Finding last changeset that was executed on database ...");

    try {
        const query = `SELECT TOP 1 [name], [date] FROM ${changesetsTableName} ORDER BY [name] ASC`;

        config.debug4(query);

        const rs = await db.executeQuery({ query });

        result = rs && rs.length ? rs[0] : null;

        if (result) {
            console.log(`First changeset is ${chalk.cyan(result.name)}, executed at ${chalk.cyan(formatDate(result.date))}.`)
        } else {
            console.log('Database journal is empty.');
        }
    } catch (ex) {
        throw new Exception(`Cannot read first executed changeset from database`, ex);
    }

    return result;
}

export default getFirstExecutedChangeset;