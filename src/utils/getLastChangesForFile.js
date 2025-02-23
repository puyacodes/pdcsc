import simpleGit from "simple-git";

const git = simpleGit();

async function getLastChangesForFile(config, filePath) {
    try {
        const lastCommitHash = await findLastCommitForFile(filePath);
        if (!lastCommitHash) {
            return null;
        }
        return await showFileChanges(config, lastCommitHash, filePath);
    } catch (error) {
        console.error(`Error during find lasr changes for ${filePath}:`, error.message);
        return null;
    }
}


/*FUNCTIONS*/

async function findLastCommitForFile(filePath) {
    try {
        const log = await git.log({ file: filePath });
        if (!log.all.length) {
            throw new Error(`No changes found for ${filePath}`);
        }
        return log.all[0].hash;
    } catch (error) {
        throw new Error(`Error during git log: ${error.message}`);
    }
}

async function showFileChanges(config, commitHash, filePath) {
    try {
        const changes = await git.show([`${commitHash}:${filePath}`]);
        
        config.debug(`last commit for file: ${commitHash}:\n`);
        config.debug(`last changes for file: ${changes}`);
        
        return JSON.parse(changes);
    } catch (error) {
        throw new Error(`Error during show last changes for file: ${error.message}`);
    }
}

export default getLastChangesForFile;
