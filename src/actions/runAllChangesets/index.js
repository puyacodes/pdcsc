import runAllChangesets from "./runAllChangesets.js";
import getAllChangesetFiles from "./getAllChangesetFiles.js";
import { Exception } from "@locustjs/exception";

async function run(config) {
    try {
        const result = await getAllChangesetFiles(config);

        config.debug("allChangesetsScriptFilePath:", result.allChangesetsScriptFilePath)
        
        if (result?.allChangesetsScriptFilePath) {
            await runAllChangesets(result, config);
        }
    } catch (ex) {
        throw new Exception('executing changesets was not successful', ex)
    }
}

export default run;