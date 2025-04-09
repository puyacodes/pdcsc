import renderChangesetScript from "../../utils/renderChangesetScript";
import fs from "fs";

async function saveFinalScript(config, deleteds) {
    config.debug("Saving final changeset script ...");

    const { scriptTempFilePath, changesetTempFilePath, finalChangesetName } = config;
    const { script, error, hasAnything } = await renderChangesetScript(config, changesetTempFilePath, finalChangesetName, deleteds);

    if (!error) {
        fs.writeFileSync(scriptTempFilePath, script, "utf-8");
    
        config.debug("Temp changeset saved.")
    }
    
    return { error, hasAnything };
}

export default saveFinalScript;