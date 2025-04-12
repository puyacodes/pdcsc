import { isNullOrEmpty } from "@locustjs/base";
import renderChangesetScript from "../../utils/renderChangesetScript";
import fs from "fs";

async function saveFinalScript(config, allFiles) {
    config.debug("Saving final changeset script ...");

    const {
        scriptFilePath,
        scriptTempFilePath,
        changesetTempFilePath,
        finalChangesetName,
        finalDeleteds
    } = config;
    const { script, error, hasAnything } = await renderChangesetScript(config, changesetTempFilePath, finalChangesetName, finalDeleteds, allFiles);

    if (!error) {
        fs.writeFileSync(scriptTempFilePath, script, "utf-8");
        fs.renameSync(scriptTempFilePath, scriptFilePath);

        config.debug(`Temp changeset saved.`)
    }

    config.error = error;
    config.hasAnything = hasAnything;

    return isNullOrEmpty(config.error);
}

export default saveFinalScript;