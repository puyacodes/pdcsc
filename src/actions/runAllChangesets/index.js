import fs from "fs";
import chalk from "chalk";
import { Exception } from "@locustjs/exception";
import runAndAddChangeset from "./runAndAddChangeset.js";
import testPendingChangesets from "./testPendingChangesets.js";
import { ApplyMode } from "../../enums.js";
import getPendingChangesets from "./getPendingChangesets.js";
import getExecutedChangesets from "./getExecutedChangesets.js";
import checkIfGitRepo from "../../utils/checkIfGitRepo.js";
import checkIfBranchIsReady from "./checkIfBranchIsReady.js";
import ensureJournalTableCreated from "./ensureJournalTableCreated.js";
import getDatabaseVersion from "./getDatabaseVersion.js";

async function run(config) {
    let error;
    const { applyMode } = config;

    // TODO: Done
    // exec mode
    //  test
    //  test & update   * default
    //  update

    do {
        if (config.inPipeline) {
            if (!await checkIfGitRepo(config)) {
                error = config.error;
                break;
            }

            if (!await checkIfBranchIsReady(config)) {
                error = config.error;
                break;
            }
        }

        try {
            console.log(`database: ${chalk.magenta(config.database.database)}`);
            console.log(`\tapply mode = ${chalk.yellow(ApplyMode[applyMode])}, ` +
                        `one-by-one = ${chalk.yellow(config.applyOneByOne)}, ` +
                        `force journal = ${chalk.yellow(config.forceJournalTable)}, `);

            error = await ensureJournalTableCreated(config);

            if (error) {
                break;
            }

            if (!fs.existsSync(config.paths.changesetsPath)) {
                error = `Changes folder ${config.paths.changesetsPath} not found.`;
                break;
            }

            const executedChangesets = await getExecutedChangesets(config);
            const appVersion = await getDatabaseVersion(config);
            const pendingChangesets = getPendingChangesets(config, executedChangesets, appVersion);

            config.debug3({ pendingChangesets })

            if (!pendingChangesets.length) {
                console.log("No pending changeset found. Database is up-to-date.");
                break;
            }

            let scripts;

            const tr = await testPendingChangesets(config, pendingChangesets);

            error = tr.error;
            scripts = tr.scripts;

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
                    // config.debug3(`${i}. changeset: ${changeset.name}`);

                    const script = scripts[changeset.name];

                    // config.debug3(`\tscript length: ${script?.length}`);

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