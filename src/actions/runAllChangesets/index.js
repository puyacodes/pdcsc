import ensureChangesTableCreated from "./ensureChangesTableCreated.js";
import { Exception } from "@locustjs/exception";
import runChangeset from "./runAndAddChangeset.js";
import testPendingChangesets from "./testPendingChangesets.js";
import { UpdateMode } from "../../enums.js";
import getLastExecutedChangeset from "./getLastExecutedChangeset.js";
import getPendingChangesets from "./getPendingChangesets.js";

async function run(config) {
    let error;
    const { updateMode } = config;

    // TODO: Done
    // exec mode
    //  test
    //  test & update   * default
    //  update

    try {
        await ensureChangesTableCreated(config);

        const lastExecutedChangeset = await getLastExecutedChangeset(config);
        const pendingChangesets = getPendingChangesets(config, lastExecutedChangeset);

        if (pendingChangesets.length) {
            if (updateMode == UpdateMode.TestAndUpdate || updateMode == UpdateMode.Test) {
                error = await testPendingChangesets(config, pendingChangesets);
            }

            if (!error) {
                // TODO: Done
                // run changeset one by one instead of merging them together and create a large script and run that.

                if (updateMode == UpdateMode.TestAndUpdate || updateMode == UpdateMode.Update) {
                    for (let changeset of pendingChangesets) {
                        error = await runChangeset(config, changeset);

                        if (error) {
                            break;
                        }
                    }
                }
            }
        }
    } catch (ex) {
        error = new Exception('updating database failed', ex);
    }

    return error;
}

export default run;