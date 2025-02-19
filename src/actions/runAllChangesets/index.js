import runAllChangesets from "./runAllChangesets.js";
import getAllChangesetFiles from "./getAllChangesetFiles.js";

async function run(config) {
    try {
        const result = await getAllChangesetFiles(config);

        if (config.debugMode) {
            console.log("allChangesetsScriptFilePath:", result.allChangesetsScriptFilePath)
        }
        
        if (result?.allChangesetsScriptFilePath) {
            await runAllChangesets(result, config);
        } else {
            return;
        }
    } catch (error) {
        if (config.debugMode) {
            throw new Error(error);
        } else {
            throw new Error(error.message);
        }
    }
}

export default run;