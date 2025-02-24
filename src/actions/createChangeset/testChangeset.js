import fs from "fs";
import FileHelper from "../../services/FileHelper";
import simpleGit from "simple-git";
import testChangesetScript from "../testChangesetScript";
import { Exception } from "@locustjs/exception";

async function testChangeset({
    tempScript,
    temptxtfile,
    scriptFile,
    txtFile,
    config
}) {
    const { paths } = config;

    const tempScriptContent = fs.readFileSync(tempScript, "utf-8");

    let error = await testChangesetScript(config, tempScriptContent);

    if (!error) {
        try {
            fs.renameSync(tempScript, scriptFile);
            fs.renameSync(temptxtfile, txtFile);

            console.log(`Script saved at: ${scriptFile}`);

            // Step 7: Commit changeset files
            await commitChanges([txtFile, scriptFile]);
        } catch (ex) {
            error = ex;
        }
    }

    FileHelper.deleteFiles(tempScript, temptxtfile, paths.backupFile);

    return error;
}

async function commitChanges(files) {
    const git = simpleGit();
    
    try {
        for (let file of files) {
            await git.add(file);
        }

        await git.commit("pdcsc: changeset created.");
    } catch (ex) {
        throw new Exception(`Error during commiting changes`, ex);
    }
}

export default testChangeset;