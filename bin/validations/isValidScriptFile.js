function isValidScriptFile(props) {
    if (!props.file.startsWith(props.config.paths.scriptsFolderName)) {
        return false
    }

    if (!props.file.toLowerCase().endsWith('.sql')) {
        return false;
    }

    const segments = props.file.split('/');

    if (!segments.length) {
        return false;
    }

    if (segments.length < 2) {
        return false;
    }
    const subdir = segments[1].toLowerCase();

    const validFolders = Object.values(props.config.folders).map(folder => folder.toLowerCase());

    if (!validFolders.some(folder => subdir.startsWith(folder))) {
        return false;
    }

    return true;
}

module.exports = { isValidScriptFile }