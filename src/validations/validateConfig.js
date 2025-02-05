const fs = require("fs");
const path = require("path");

function validateConfig(config) {
    if (!config.database) {
        config.database = {}
    }

    if (!config.paths) {
        config.paths = {}
    }

    if (!config.pipeline) {
        config.pipeline = "gitlabs";
    }

    if (!config.paths.backupDir) {
        config.paths.backupDir = "C:\\temp\\";
    }

    if (!config.paths.changesetFolderName) {
        config.paths.changesetFolderName = "Changes";
    }

    if (!config.paths.scriptsFolderName) {
        config.paths.scriptsFolderName = "Scripts";
    }

    if (!config.paths.appVersionFormat) {
        config.paths.appVersionFormat = "YYYY-MM-DD HH:mm:ss";
    }

    if (!config.paths.timestampLocale) {
        config.paths.timestampLocale = "en";
    }

    if (!config.paths.masterBranchName) {
        config.paths.masterBranchName = "origin/dev";
    }

    if (!config.paths.changesetsTableName) {
        config.paths.changesetsTableName = "Changesets";
    }

    if (!config.appVersionSprocName) {
        config.appVersionSprocName = "dbo.getAppVersion";
    }

    if (!config.database.server) {
        throw new Error(`server not specified`);
    }

    if (!config.database.user) {
        throw new Error(`user not specified`);
    }

    if (!config.database.password) {
        throw new Error(`password not specified`);
    }

    if (!config.database.databaseName) {
        throw new Error(`databaseName not specified`);
    }

    if (!config.folders) {
        config.folders = {
            "procedures": "Procedures",
            "functions": "Functions",
            "tables": "Tables",
            "relations": "Relations",
            "types": "Types",
            "views": "Views",
            "indexes": "Indexes",
            "triggers": "Triggers",
            "schemas": "Schemas"
        };
    }

    if (!fs.readdirSync(path.join(config.basePath, config.paths.scriptsFolderName)).some(folder =>
        Object.values(config.folders).some(templateFolder => folder === templateFolder)
    )) {
        throw new Error("Please specify the subfolders and their names in the 'folders' section of the config file.");
    }

}


module.exports = validateConfig;