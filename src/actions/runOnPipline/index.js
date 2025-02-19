import { getChangesetFile } from "../../utils/getChangesetFile.js";
import runOnPipeline from "./runOnPipeline.js";
import path from "path";

async function run(config) {
    try {
        const changesetFileName = await getChangesetFile(config.settings);
        if (changesetFileName) {
            const scriptFilePath = path.join(config.settings.changesetPath, `${changesetFileName}`);
            await runOnPipeline(config, scriptFilePath);
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