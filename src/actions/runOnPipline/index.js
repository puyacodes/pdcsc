import getChangesetFile from "./getChangesetFile.js";
import runOnPipeline from "./runOnPipeline.js";
import path from "path";

async function run(config) {
    const changesetFileName = await getChangesetFile(config);

    if (changesetFileName) {
        const changesetPath = path.join(config.paths.changesetsPath, `${changesetFileName}`);

        await runOnPipeline(config, changesetPath);
    }
}

export default run;