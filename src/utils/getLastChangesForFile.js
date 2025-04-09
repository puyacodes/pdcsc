import { Exception } from "@locustjs/exception";
import simpleGit from "simple-git";

const git = simpleGit();

async function getLastChangesForFile(config, filePath) {
    try {
        const lastCommitHash = await findLastCommitForFile(filePath);
        if (!lastCommitHash) {
            return null;
        }
        return await showFileChanges(config, lastCommitHash, filePath);
    } catch (ex) {
        console.error(`Error during find lasr changes for ${filePath}:`, ex.message);
        return null;
    }
}


/*FUNCTIONS*/

async function findLastCommitForFile(filePath) {
    try {
        const log = await git.log({ file: filePath });
        if (!log.all.length) {
            throw new Exception(`No changes found for ${filePath}`);
        }
        return log.all[0].hash;
    } catch (ex) {
        throw new Exception(`Error during git log`, ex);
    }
}

async function showFileChanges(config, commitHash, filePath) {
    try {
        const changes = await git.show([`${commitHash}:${filePath}`]);
        
        config.debug(`last commit for file: ${commitHash}:\n`);
        config.debug(`last changes for file: ${changes}`);
        
        return JSON.parse(changes);
    } catch (ex) {
        throw new Exception(`Error during show last changes for file`, ex);
    }
}

export default getLastChangesForFile;
