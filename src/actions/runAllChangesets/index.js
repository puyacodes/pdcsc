import ensureChangesTableCreated from "./ensureChangesTableCreated.js";
import { Exception } from "@locustjs/exception";
import runAndAddChangeset from "./runAndAddChangeset.js";
import testPendingChangesets from "./testPendingChangesets.js";
import { ApplyMode } from "../../enums.js";
import getLastExecutedChangeset from "./getLastExecutedChangeset.js";
import getPendingChangesets from "./getPendingChangesets.js";
import fs from "fs";
import getAllSqlFiles from "../../utils/getAllSqlFiles";
import chalk from "chalk";

async function run(config) {
    let error;
    const { applyMode } = config;

    // TODO: Done
    // exec mode
    //  test
    //  test & update   * default
    //  update

    try {
        console.log(`Apply mode = ${chalk.yellow(ApplyMode[applyMode])}, force = ${chalk.yellow(config.forceMode)}, oneByOne = ${chalk.yellow(config.applyOneByOne)}, database = ${chalk.magenta(config.database.database)} ...`);

        await ensureChangesTableCreated(config);

        if (fs.existsSync(config.paths.changesetsPath)) {
            const lastExecutedChangeset = await getLastExecutedChangeset(config);
            const pendingChangesets = getPendingChangesets(config, lastExecutedChangeset);

            if (pendingChangesets.length) {
                let scripts;
                const allFiles = getAllSqlFiles(config, config.paths.scriptsPath);

                if (allFiles.length == 0) {
                    console.warn(`${chalk.yellow("Warning: ./Scripts directory not found or it is empty.")}`);
                    console.warn(`${chalk.yellow("\tWe have to fall back to changesets' rendered .sql files.")}`);
                    console.warn(`${chalk.yellow("\tThis is not recommended and may lead to unexpected errors if .sql files are not in sync with changesets.")}`);
                }

                if (applyMode == ApplyMode.TestAndUpdate || applyMode == ApplyMode.Test) {
                    const tr = await testPendingChangesets(config, pendingChangesets, allFiles);

                    error = tr.error;
                    scripts = tr.scripts;
                }

                if (!error) {
                    // TODO: Done
                    // run changeset one by one instead of merging them together and create a large script and run that.

                    if (applyMode == ApplyMode.TestAndUpdate || applyMode == ApplyMode.Update) {
                        console.log(`Applying changesets ...`);

                        for (let changeset of pendingChangesets) {
                            const script = scripts ? scripts[changeset.name] : null;

                            error = await runAndAddChangeset(config, changeset, script, allFiles);

                            if (error) {
                                console.log("Operation aborted due to errors.");

                                break;
                            }
                        }
                    }
                } else {
                    console.log("Operation aborted.")
                }
            } else {
                console.log("No pending changeset found. Database is up-to-date.")
            }
        } else {
            error = `Changes folder ${config.paths.changesetsPath} not found.`;
        }
    } catch (ex) {
        error = new Exception('updating database failed.', ex);
    }

    if (!error) {
        config.debug("Operation completed.");
    }

    return error;
}

export default run;