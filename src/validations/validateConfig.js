import { isEmpty, isObject } from "@locustjs/base";
import fs from "fs";
import path from "path";

function validateConfig(config) {
    if (!isObject(config.database)) {
        config.database = {}
    }

    if (!isObject(config.paths)) {
        config.paths = {}
    }

    if (isEmpty(config.pipeline)) {
        config.pipeline = "gitlabs";
    }

    if (isEmpty(config.paths.backupDir)) {
        config.paths.backupDir = "C:\\temp\\";
    }

    if (isEmpty(config.backupDbName)) {
        config.backupDbName = "TempBackupDB";
    }

    if (isEmpty(config.paths.changesetFolderName)) {
        config.paths.changesetFolderName = "Changes";
    }

    if (isEmpty(config.paths.scriptsFolderName)) {
        config.paths.scriptsFolderName = "Scripts";
    }

    if (isEmpty(config.appVersionFormat)) {
        config.appVersionFormat = "YYYY-MM-DD HH:mm:ss";
    }

    if (isEmpty(config.timestampLocale)) {
        config.timestampLocale = "en";
    }

    if (isEmpty(config.masterBranchName)) {
        config.masterBranchName = "origin/main";
    }

    if (isEmpty(config.changesetsTableName)) {
        config.changesetsTableName = "Changesets";
    }

    if (isEmpty(config.appVersionSprocName)) {
        config.appVersionSprocName = "dbo.getAppVersion";
    }

    if (isEmpty(config.database.server)) {
        throw new Error(`server not specified`);
    }

    if (isEmpty(config.database.user)) {
        throw new Error(`user not specified`);
    }

    if (isEmpty(config.database.password)) {
        throw new Error(`password not specified`);
    }

    if (isEmpty(config.database.database)) {
        throw new Error(`database not specified`);
    }

    if (!isObject(config.folders)) {
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

    config.debugMode = args.includes("-dbm");
    config.runMode = config.action == ActionType.runOnPipline || config.action == ActionType.runAllChangesets;
    config.db = new DbHelperSqlServer(config.database);
    
    config.paths.changesetsPath = path.join(config.basePath, config.paths.changesetFolderName);
}


export default validateConfig;