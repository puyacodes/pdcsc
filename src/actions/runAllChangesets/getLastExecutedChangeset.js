import { Exception } from "@locustjs/exception";
import chalk from "chalk";
import formatDate from "../../utils/formatDate";

async function getLastExecutedChangeset(config) {
    const { db, changesetsTableName } = config;

    let result;

    console.log("Finding last changeset that was executed on database ...");

    try {
        const query = `SELECT TOP 1 [date], [name] FROM ${changesetsTableName} ORDER BY [date] DESC`;

        config.debug4(query);

        const rs = await db.executeQuery({ query });

        result = rs && rs.length ? rs[0] : null;

        if (result) {
            console.log(`Last changeset is ${chalk.cyan(result.name)}, executed at ${chalk.cyan(formatDate(result.date))}.`)
        } else {
            console.log('No changeset has already executed on database.');
        }
    } catch (ex) {
        throw new Exception(`Cannot read last executed changeset from database`, ex);
    }

    return result;
}

export default getLastExecutedChangeset;