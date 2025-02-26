async function filterChanges(config, changes) {
    const folders = Object.values(config.folders);
    const result = changes.filter(file => {
        const isInScriptsFolder = folders.some(folder => file.startsWith(`${config.paths.scriptsFolderName}/${folder}`));
        const isSqlFile = file.endsWith(".sql");

        return isInScriptsFolder && isSqlFile;
    });

    return result;
}

export default filterChanges;