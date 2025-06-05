import fs from "fs";
import testScript from "../testScript";
import { Exception } from "@locustjs/exception";
import commitChanges from "../../utils/commitChanges";
import chalk from 'chalk';
import { isNullOrEmpty } from "@locustjs/base";

async function testAndCommitChangeset(config) {
    const {
        scriptFilePath,
        finalChangeset,
        isNewChangeset,
        finalScript
    } = config
    const tempScriptContent = fs.readFileSync(scriptFilePath, "utf-8");

    console.log("Testing changeset ...");

    // Todo: Done
    // skip test and commit if changeset has no new changes

    config.debug1(`\thasChanges: ${config.hasChanges}, hasAnything: ${config.hasAnything}`);

    if (config.hasChanges) {
        if (config.hasAnything) {
            config.error = await testScript(config, tempScriptContent);
        } else {
            console.log(`No changes detected. Testing changeset skipped.`)
        }
    } else {
        console.log("Skipped changeset testing. No new changes detected.")
    }

    if (config.error) {
        console.log(`See ${chalk.yellow('error.log')} for more details`);
    } else {
        if (config.hasChanges && config.hasAnything) {
            console.log(chalk.green("Passed.\n"));
        }

        try {
            fs.writeFileSync(scriptFilePath, finalScript, "utf-8");

            config.error = await commitChanges([scriptFilePath], `pdcsc: changeset ${finalChangeset} ${isNewChangeset ? "created" : `updated`}.`);

            if (!config.error) {
                config.changesetCommitted = true;
            }
        } catch (ex) {
            config.error = new Exception('error happened while finalizing changeset.', ex);
        }
    }

    return isNullOrEmpty(config.error);
}

export default testAndCommitChangeset;