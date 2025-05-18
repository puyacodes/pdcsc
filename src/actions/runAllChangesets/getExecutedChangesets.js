import { Exception } from "@locustjs/exception";
import chalk from "chalk";

async function getExecutedChangesets(config) {
    const { db, changesetsTableName } = config;

    let result;

    console.log("Retrieving all changesets executed on database ...");

    try {
        // we should not sort by date. changesets can be executed anytime.
        // we MUST sort by name. changesets' name already has a timestamp
        // which provides sortability.

        const query = `SELECT [name], [date] FROM ${changesetsTableName} ORDER BY [name]`;

        config.debug4(query);

        const rs = await db.executeQuery({ query });

        result = rs || [];

        if (result) {
            console.log(`Number of already executed changesets: ${chalk.cyan(result.length)}`)
        } else {
            console.log('No changeset already executed on database.');
        }
    } catch (ex) {
        throw new Exception(`Cannot read changesets from database`, ex);
    }

    return result;
}

export default getExecutedChangesets;