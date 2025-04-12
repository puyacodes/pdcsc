import chalk from "chalk";

function isValidScriptFile(config, file) {
    if (!file.startsWith(config.paths.scriptsFolderName)) {
        return false
    }

    if (!file.toLowerCase().endsWith('.sql')) {
        return false;
    }

    const segments = file.split('/');

    if (!segments.length) {
        return false;
    }

    if (segments.length < 2) {
        return false;
    }
    
    const subdir = segments[1].toLowerCase();

    const validFolders = Object.values(config.folders).map(folder => folder.toLowerCase());

    if (!validFolders.some(folder => subdir.startsWith(folder))) {
        console.warn(chalk.yellow(`Warning: sql changed file ${file} ignored (unknown folder type).`));

        return false;
    }

    return true;
}

export default isValidScriptFile;