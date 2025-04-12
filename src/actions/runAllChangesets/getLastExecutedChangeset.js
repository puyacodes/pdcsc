import { Exception } from "@locustjs/exception";
import chalk from "chalk";

async function getLastExecutedChangeset(config) {
    const { db, changesetsTableName } = config;

    let result;

    config.debug("Getting last executed changeset on database ...");

    try {
        const query = `SELECT TOP 1 [date], [name] FROM ${changesetsTableName} ORDER BY [date] DESC`;

        config.debug4(query);

        const rs = await db.executeQuery({ query });

        result = rs && rs.length ? rs[0] : null;

        if (result) {
            config.debug(`Last changeset is ${chalk.cyan(result)}.`)
        } else {
            config.debug('No changeset has already executed on database.');
        }
    } catch (ex) {
        throw new Exception(`Cannot fetch last executed changeset`, ex);
    }

    return result;
}

export default getLastExecutedChangeset;