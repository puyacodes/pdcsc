import fs from "fs";
import FileHelper from "../../services/FileHelper";
import simpleGit from "simple-git";
import backupAndRunScript from "../backupAndRunScript";

async function backupAndRun({
    tempScript,
    temptxtfile,
    scriptFile,
    txtFile,
    config
}) {
    const { paths } = config;

    const tempScriptContent = fs.readFileSync(tempScript, "utf-8");

    let error = await backupAndRunScript(config, tempScriptContent);

    if (!error) {
        try {
            fs.renameSync(tempScript, scriptFile);
            fs.renameSync(temptxtfile, txtFile);

            console.log(`Script saved at: ${scriptFile}`);

            // Step 7: Commit changeset files
            await commitChanges([txtFile, scriptFile]);
        } catch (e) {
            error = e;
        }
    }

    FileHelper.deleteFiles(tempScript, temptxtfile, paths.backupFile);

    return error;
}

/* FUNCTIONS */
async function commitChanges(files) {
    const git = simpleGit();
    
    try {
        for (let file of files) {
            await git.add(file);
        }

        await git.commit("pdcsc: changeset created.");
    } catch (error) {
        throw new Error(`Error during commiting changes: ${error}`);
    }
}

export default backupAndRun;