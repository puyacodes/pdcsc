const fs = require("fs");

async function getChangesetFile(defaults) {
    const changedFiles = fs.readdirSync(defaults.changesetPath);
    const changesetFile = changedFiles
        .find(file =>
            file.includes(defaults.currentBranch.replace("-", "_")) && file.endsWith(".sql")
        );
    if (changesetFile) {
        const indexOfLastSlash = changesetFile.lastIndexOf('/');
        const changesetFileName = changesetFile.substring(indexOfLastSlash + 1);
        console.log(`Found changeset file: ${changesetFileName}`);

        return changesetFileName;
    } else {
        console.log(`No changeset file found for branch '${defaults.currentBranch}'`);
    }
}

module.exports = { getChangesetFile }