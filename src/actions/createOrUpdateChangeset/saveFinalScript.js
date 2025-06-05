import fs from "fs";
import { isNullOrEmpty } from "@locustjs/base";
import renderChangesetScript from "../../utils/renderChangesetScript";
import commitChanges from "../../utils/commitChanges";
import getAppVersion from "../../utils/getAppVersion";
import chalk from "chalk";

async function saveFinalScript(config, allFiles) {
    config.debug("Saving final changeset script ...");

    const {
        scriptFilePath,
        finalChangeset,
        finalChangesetName,
        finalChangesetFilePath,
        finalDeleteds,
        isNewChangeset
    } = config;
    const { script, error, hasAnything } = await renderChangesetScript(config, finalChangesetFilePath, finalChangesetName, finalDeleteds, allFiles, false);

    let old;
    let hasChanges = true;

    if (!error) {
        if (fs.existsSync(scriptFilePath)) {
            old = fs.readFileSync(scriptFilePath, "utf-8");
        }

        config.finalScript = `${script}${getAppVersion(config, finalChangesetName)}`;

        if (old) {
            const i = old.lastIndexOf(`-- ${config.appVersionSprocName}`);

            if (i >= 0) {
                const scriptOld = old.substr(0, i).trim();
                const scriptNew = script.trim();

                hasChanges = scriptNew != scriptOld;

                config.debug1(`Script size: old = ${scriptOld.length}, new = ${scriptNew.length}`);
                config.debug7(`scripts`, { old: scriptOld, "new": scriptNew });
            } else {
                config.debug1(`Script size diff: not applicable`);
            }
        }

        fs.writeFileSync(scriptFilePath, script, "utf-8");

        config.debug(`changeset ${chalk.gray(finalChangesetName)} script saved`);

        const changes = [scriptFilePath];

        config.error = await commitChanges(changes, `changeset ${finalChangeset}: script ${isNewChangeset ? "created" : `updated`}.`);

        if (!config.error) {
            config.changesetScriptChanged = true;
        }
    } else {
        config.error = error;

        console.warn(chalk.yellow(`WARNING: changeset template created, but rendering it was not successful.\n\tChangeset script is not in sync with its template.`))
    }

    config.hasAnything = hasAnything;
    config.hasChanges = !error && hasChanges;

    return isNullOrEmpty(config.error);
}

export default saveFinalScript;