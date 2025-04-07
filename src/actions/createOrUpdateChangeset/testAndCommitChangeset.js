import fs from "fs";
import testScript from "../testScript";
import { Exception } from "@locustjs/exception";
import commitChanges from "../../utils/commitChanges";
import chalk from 'chalk';

async function testAndCommitChangeset(config) {
    const {
        scriptFilePath,
        scriptTempFilePath,
        finalChangesetFilePath,
        changesetTempFilePath
    } = config
    const tempScriptContent = fs.readFileSync(scriptTempFilePath, "utf-8");

    console.log("Testing changeset ...");

    let error = await testScript(config, tempScriptContent);

    if (error) {
        console.log(chalk.red("Failed.\n"));
        console.log("See error.log for more details");
    } else {
        console.log(chalk.green("Passed.\n"));

        try {
            fs.renameSync(scriptTempFilePath, scriptFilePath);
            fs.renameSync(changesetTempFilePath, finalChangesetFilePath);

            const changes = [finalChangesetFilePath]

            config.debug2("Commiting changes", changes);

            error = await commitChanges(changes, `pdcsc: changeset ${config.finalChangeset} ${config.isNewChangeset ? "created" : `updated`}.`);

            if (!error) {
                config.changesetCommitted = true;
            }
        } catch (ex) {
            error = new Exception('error happened while renaming temp files or committing changes.', ex);
        }
    }

    return error;
}

export default testAndCommitChangeset;