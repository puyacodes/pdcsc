const simpleGit = require("simple-git");

async function getChangesetFile(masterBranchName, realBranchName, currentBranch) {
    const git = simpleGit();
    const changedFiles = await git.diff(['--name-only', masterBranchName, 'origin/' + realBranchName]);
    const changesetFile = changedFiles.split('\n').find(file => file.includes(currentBranch.replace("-", "_")));
    if (changesetFile) {
        const indexOfLastSlash = changesetFile.lastIndexOf('/');
        const changesetFileName = changesetFile.substring(indexOfLastSlash + 1);
        console.log(`Found changeset file: ${changesetFileName}`);

        return changesetFileName;
    } else {
        console.log(`No changeset file found for branch '${currentBranch}'`);
    }
}

module.exports = { getChangesetFile }