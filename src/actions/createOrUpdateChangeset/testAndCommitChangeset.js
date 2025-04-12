import fs from "fs";
import testScript from "../testScript";
import { Exception } from "@locustjs/exception";
import commitChanges from "../../utils/commitChanges";
import chalk from 'chalk';
import { isNullOrEmpty } from "@locustjs/base";

async function testAndCommitChangeset(config) {
    const {
        scriptFilePath,
        finalChangesetFilePath,
        changesetTempFilePath
    } = config
    const tempScriptContent = fs.readFileSync(scriptFilePath, "utf-8");

    console.log("Testing changeset ...");

    if (config.hasAnything) {
        config.error = await testScript(config, tempScriptContent);
    } else {
        console.log(`No changes detected. Testing changeset skipped.`)
    }

    if (config.error) {
        console.log(chalk.red("Failed.\n"));
        console.log("See error.log for more details");
    } else {
        if (config.hasAnything) {
            console.log(chalk.green("Passed.\n"));
        }
        
        try {
            fs.renameSync(changesetTempFilePath, finalChangesetFilePath);

            const changes = [finalChangesetFilePath]

            config.debug2("Commiting changes", changes);

            config.error = await commitChanges(changes, `pdcsc: changeset ${config.finalChangeset} ${config.isNewChangeset ? "created" : `updated`}.`);

            if (!config.error) {
                config.changesetCommitted = true;
            }
        } catch (ex) {
            config.error = new Exception('error happened while renaming temp files or committing changes.', ex);
        }
    }

    return isNullOrEmpty(config.error);
}

export default testAndCommitChangeset;