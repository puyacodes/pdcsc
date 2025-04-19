import chalk from "chalk";
import createErrorLog from "../../utils/createErrorLog.js";
import addChangesetToDatabase from "./addChangesetToDatabase.js";
import { isNullOrEmpty } from "@locustjs/base";
import getChangesetScript from "./getChangesetScript.js";

async function runAndAddChangeset(config, changeset, script, allFiles) {
    const { db } = config;
    let error;

    try {
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
            await db.executeBatch({ content });

            console.log(`\t${chalk.green("Succeeded.")}`);

            await addChangesetToDatabase(config, changeset);
        }
    } catch (ex) {
        console.log(`\t${chalk.red("Failed.")}`);
        console.log("See error.log for more details.");

        error = ex;

        createErrorLog(config, ex);
    }

    return error;
}

export default runAndAddChangeset;