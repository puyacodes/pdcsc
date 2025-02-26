import fs from "fs";

async function getChangesetFile(config) {
    const { changesetsPath } = config.paths;
    const { currentBranch } = config;
    const _currentBranch = currentBranch.replace("-", "_");
    const changedFiles = fs.readdirSync(changesetsPath);
    const changeset = changedFiles
        .find(file =>
            file.includes(_currentBranch) && file.endsWith(".sql")
        );
    if (changeset) {
        const indexOfLastSlash = changeset.lastIndexOf('/');
        const changesetFileName = changeset.substring(indexOfLastSlash + 1);

        console.log(`Found changeset file: ${changesetFileName}`);

        return changesetFileName;
    } else {
        console.warn(`No changeset file found for branch '${currentBranch}'`);
    }
}

export default getChangesetFile;