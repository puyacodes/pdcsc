import fs from "fs";
import createErrorLog from "../../utils/createErrorLog.js";
import addChangesetToDatabase from "./addChangesetToDatabase.js";
import chalk from "chalk";

async function runAndAddChangeset(config, changeset) {
    console.log(`Executing changeset ${chalk.cyan(changeset.name)} on database ...`);

    const { db } = config;
    let error;

    try {
        const content = fs.readFileSync(changeset.path, "utf-8");

        await db.executeBatch({ content });

        console.log(`  ${chalk.green("Succeeded.")}`);

        await addChangesetToDatabase(config, changeset);
    } catch (ex) {
        console.log(`  ${chalk.red("Failed.")}`);
        console.log("See error.log for more details.");

        error = ex;

        createErrorLog(config, ex);
    }

    return error;
}

export default runAndAddChangeset;