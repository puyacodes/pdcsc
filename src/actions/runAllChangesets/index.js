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
        console.log(`Applying changesets on database ${chalk.magenta(config.database.database)} ...`);

        await ensureChangesTableCreated(config);

        if (fs.existsSync(config.paths.changesetsPath)) {
            const lastExecutedChangeset = await getLastExecutedChangeset(config);
            const pendingChangesets = getPendingChangesets(config, lastExecutedChangeset);

            if (pendingChangesets.length) {
                let scripts;
                const allFiles = getAllSqlFiles(config.paths.scriptsPath);

                if (allFiles.length == 0) {
                    console.warn(`${chalk.yellow("Warning: Scripts directory not found. Using existing rendered .sql files.")}`);
                    console.warn(`${chalk.yellow("\tThis could lead to bugs if .sql files are not in sync with changesets.")}`);
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
                        for (let changeset of pendingChangesets) {
                            const script = scripts ? scripts[changeset.name] : null;

                            error = await runAndAddChangeset(config, changeset, script, allFiles);

                            if (error) {
                                break;
                            }
                        }
                    }
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

    return error;
}

export default run;