import ensureChangesTableCreated from "./ensureChangesTableCreated.js";
import { Exception } from "@locustjs/exception";
import runAndAddChangeset from "./runAndAddChangeset.js";
import testPendingChangesets from "./testPendingChangesets.js";
import { ApplyMode } from "../../enums.js";
import getLastExecutedChangeset from "./getLastExecutedChangeset.js";
import getPendingChangesets from "./getPendingChangesets.js";
import fs from "fs";
import chalk from "chalk";

async function run(config) {
    let error;
    const { applyMode } = config;

    // TODO: Done
    // exec mode
    //  test
    //  test & update   * default
    //  update

    do {
        try {
            console.log(`Apply mode = ${chalk.yellow(ApplyMode[applyMode])}, one-by-one = ${chalk.yellow(config.applyOneByOne)}, database = ${chalk.magenta(config.database.database)}`);
    
            error = await ensureChangesTableCreated(config);
    
            if (!error) {
                break;
            }

            if (!fs.existsSync(config.paths.changesetsPath)) {
                error = `Changes folder ${config.paths.changesetsPath} not found.`;
                break;
            }

            const lastExecutedChangeset = await getLastExecutedChangeset(config);
            const pendingChangesets = getPendingChangesets(config, lastExecutedChangeset);

            if (!pendingChangesets.length) {
                console.log("No pending changeset found. Database is up-to-date.");
                break;
            }

            let scripts;

            if (applyMode == ApplyMode.TestAndUpdate || applyMode == ApplyMode.Test) {
                const tr = await testPendingChangesets(config, pendingChangesets);

                error = tr.error;
                scripts = tr.scripts;
            }

            if (error) {
                console.log("Operation aborted.");
                break;
            }
            // TODO: Done
            // run changeset one by one instead of merging them together and create a large script and run that.

            if (applyMode == ApplyMode.TestAndUpdate || applyMode == ApplyMode.Update) {
                console.log(`Applying changesets ...`);

                let i = 1;

                for (let changeset of pendingChangesets) {
                    const script = scripts[changeset.name];

                    error = await runAndAddChangeset(config, changeset, script, i);

                    if (error) {
                        console.log("Operation aborted due to errors.");

                        break;
                    }

                    i++;
                }
            }
        } catch (ex) {
            error = new Exception('updating database failed.', ex);
        }
    } while (false);

    if (!error) {
        config.debug("Operation completed.");
    }

    return error;
}

export default run;