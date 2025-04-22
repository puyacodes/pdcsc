import chalk from "chalk";
import createErrorLog from "../../utils/createErrorLog.js";
import addChangesetToDatabase from "./addChangesetToDatabase.js";
import { isNullOrEmpty } from "@locustjs/base";
import getChangesetScript from "./getChangesetScript.js";
import { Exception } from "@locustjs/exception";

async function runAndAddChangeset(config, changeset, script, allFiles) {
    const { db } = config;
    let error;

    let content;

    if (isNullOrEmpty(script)) {
        const cr = await getChangesetScript(config, changeset, allFiles);

        if (cr.error) {
            error = cr.error
        } else {
            content = cr.script;
        }
    } else {
        content = script;
    }

    if (!error) {
        console.log(`Executing changeset ${chalk.cyan(changeset.name)} ...`);

        try {
            await db.executeBatch({ content });

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