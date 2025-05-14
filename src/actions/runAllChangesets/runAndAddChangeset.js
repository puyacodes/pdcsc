import chalk from "chalk";
import createErrorLog from "../../utils/createErrorLog.js";
import addChangesetToDatabase from "./addChangesetToDatabase.js";
import { Exception } from "@locustjs/exception";
import { isEmpty } from "@locustjs/base";

async function runAndAddChangeset(config, changeset, script, i) {
    const { db } = config;
    let error;

    console.log(`${isEmpty(i) ? '?': i}. Executing changeset ${chalk.cyan(changeset.name)} ...`);

    try {
        await db.executeBatch({ content: script });

        console.log(chalk.green("\tSucceeded"));

        error = await addChangesetToDatabase(config, changeset, i);
    } catch (ex) {
        console.log(chalk.red("\tFailed"));

        error = new Exception(`Executing changeset #${isEmpty(i) ? '?': i} ${changeset.name} was not successful.`, ex);

        createErrorLog(config, ex);
    }

    return error;
}

export default runAndAddChangeset;