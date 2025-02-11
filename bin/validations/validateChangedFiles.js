const simpleGit = require("simple-git");

async function validateChangedFiles({
    status,
    listName,
    commit,
    folders,
    config
}) {
    const git = simpleGit();
    const allowedFolders = Object.values(folders);
    const filteredFiles = status.filter(file => {
        const isInAllowedFolder = allowedFolders.some(folder => file.startsWith(`${config.paths.scriptsFolderName}/${folder}`));
        const isSqlFile = file.endsWith(".sql");
        return isInAllowedFolder && isSqlFile;
    });

    if (config.options.debugMode) {
        console.log("filtered Uncommited files:", filteredFiles);
    }

    if (filteredFiles.length > 0) {
        if (!commit) {
            listName.push(...filteredFiles.map(file => file));
        }
        else {
            for (const file of filteredFiles) {
                await git.add(file);
            }
            await git.commit("Auto-Commit before generating changeset.");
        }
    }
}

module.exports = { validateChangedFiles }