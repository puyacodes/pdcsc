import { Exception } from "@locustjs/exception";
import chalk from "chalk";

async function getDatabaseVersion(config) {
    const { db } = config;

    let result;

    console.log("getting database version ...");

    try {
        const query = `exec ${config.appVersionSprocName}`;

        config.debug4(query);

        const rs = await db.executeQuery({ query });

        result = rs && rs.length ? rs[0]: null;

        if (result) {
            console.log(`\tchangeset: ${chalk.cyan(result.changeset)}`)
            console.log(`\tapplyDate: ${chalk.cyan(result.applyDate)}`)
        } else {
            console.warn(`WARNING: database has no app version!`);
        }
    } catch (ex) {
        throw new Exception(`Cannot get database version`, ex);
    }

    return result;
}

export default getDatabaseVersion;