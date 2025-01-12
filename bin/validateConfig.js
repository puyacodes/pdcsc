function validateConfig(config, defaults) {
    let result = Object.assign({
        database: {
            server: defaults.server,
            user: defaults.user,
            password: defaults.password,
            databaseName: defaults.databaseName
        }
    }, config)

    if (!result.database) {
        result.database = {}
    }

    if (!result.paths) {
        result.paths = {}
    }

    if (!result.paths.backupDir) {
        result.paths.backupDir = "C:\\temp\\";
    }

    if (!result.paths.changesetFolderName) {
        result.paths.changesetFolderName = "Changes";
    }

    if (!result.paths.scriptsFolderName) {
        result.paths.scriptsFolderName = "Scripts";
    }

    if (!result.paths.appVersionFormat) {
        result.paths.appVersionFormat = "YYYY-MM-DD HH:mm:ss";
    }

    if (!result.paths.timestampLocale) {
        result.paths.timestampLocale = "en";
    }

    if (!result.paths.masterBranchName) {
        result.paths.masterBranchName = "origin/dev";
    }

    return result;
}


module.exports = validateConfig;