import chalk from "chalk";
import createErrorLog from "../../utils/createErrorLog.js";
import addChangesetToDatabase from "./addChangesetToDatabase.js";
import { Exception } from "@locustjs/exception";

async function runAndAddChangeset(config, changeset, script) {
    const { db } = config;
    let error;

    if (!error) {
        console.log(`Executing changeset ${chalk.cyan(changeset.name)} ...`);

        try {
            await db.executeBatch({ content: script });

            console.log(chalk.green("\tSucceeded"));

        } catch (ex) {
            console.log(chalk.red("\tFailed"));
            
            error = new Exception(`Executing changeset ${changeset.name} was not successful.`, ex);

            createErrorLog(config, ex);
        }

        if (!error) {
            error = await addChangesetToDatabase(config, changeset);
        }
    }

    return error;
}

export default runAndAddChangeset;