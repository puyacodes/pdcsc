import { ActionType } from "../../enums";

function pdcscConfigContent(config) {
    const configContent = {
        database: {
            server: ".",
            user: "sa",
            password: "****",
            database: "mydb"
        }
    };

    if (config.action == ActionType.initfull) {
        configContent.pipeline = "gitlabs";
        configContent.masterBranchName = "origin/main",
        configContent.appVersionSprocName = "dbo.getAppVersion"
        configContent.appVersionFormat = "YYYY-MM-DD HH:mm:ss",
        configContent.timestampLocale = "en";
        configContent.changesetsTableName = "Changesets";
        configContent.backupDbName = "TempBackupDB";
        configContent.paths = {
            backupDir: "C:\\temp\\",
            changesetFolderName: "Changes",
            scriptsFolderName: "Scripts",
        }
        configContent.folders = {
            Procedures: "Procedures",
            Functions: "Functions",
            Tables: "Tables",
            Relations: "Relations",
            Types: "Types",
            Views: "Views",
            Indexes: "Indexes",
            Triggers: "Triggers",
            Schemas: "Schemas"
        }
    }
    
    return JSON.stringify(configContent, null, 4);
}

export default pdcscConfigContent;
