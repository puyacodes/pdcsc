import renderChangesetScript from "../../utils/renderChangesetScript";
import fs from "fs";

async function saveFinalScript(config) {
    config.debug("Saving final changeset script ...");

    const { scriptTempFilePath, changesetTempFilePath, finalChangesetName } = config;
    const script = await renderChangesetScript(config, changesetTempFilePath, finalChangesetName);

    fs.writeFileSync(scriptTempFilePath, script, "utf-8");

    config.debug("Temp changeset saved.")
}

export default saveFinalScript;