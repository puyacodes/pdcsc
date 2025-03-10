import fs from "fs";
import FileHelper from "../../services/FileHelper";
import testScript from "../testScript";
import { Exception } from "@locustjs/exception";
import commitChanges from "../../utils/commitChanges";

async function testAndCommitChangeset(config) {
    const { paths } = config;
    const {
        scriptFilePath,
        scriptTempFilePath,
        changesetFilePath,
        changesetTempFilePath
    } = config
    const tempScriptContent = fs.readFileSync(scriptTempFilePath, "utf-8");

    let error = await testScript(config, tempScriptContent);

    if (!error) {
        try {
            error = await commitChanges([changesetFilePath, scriptFilePath], `pdcsc: changeset ${config.changeset} ${config.isNewChangeset ? "created" : "updated"}.`);

            config.changesetCommitted = true;

            if (!error) {
                fs.renameSync(scriptTempFilePath, scriptFilePath);
                fs.renameSync(changesetTempFilePath, changesetFilePath);

                console.log(`Script saved at: ${scriptFilePath}`);
            }
        } catch (ex) {
            error = new Exception('error happened while renaming changeset files.', ex);
        }
    }

    FileHelper.deleteFiles(scriptTempFilePath, changesetTempFilePath, paths.backupFile);

    return error;
}

export default testAndCommitChangeset;