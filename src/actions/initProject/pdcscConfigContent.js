function pdcscConfigContent(config) {
    const configContent = {
        database: {
            server: "127.0.0.1",
            user: "my_user",
            password: "****",
            database: "mydb",
            encrypt: false
        }
    };

    if (config.initfull) {
        console.log("Initializing a full pdcsc.config.");

        configContent.pipeline = "gitlabs";
        configContent.masterBranchName = "origin/main";
        configContent.appVersionSprocName = "dbo.getAppVersion";
        configContent.appVersionFormat = "YYYY-MM-DD HH:mm:ss";
        configContent.timestampLocale = "en";
        configContent.changesetsTableName = "Changesets";
        configContent.backupDbName = "TempBackupDB";
        configContent.defaultCodePage = "";
        configContent.paths = {
            backupDir: "C:\\temp\\",
            changesetFolderName: "Changes",
            scriptsFolderName: "Scripts",
        };
        configContent.folders = {
            procedures: "Procedures",
            functions: "Functions",
            tables: "Tables",
            relations: "Relations",
            types: "Types",
            views: "Views",
            indexes: "Indexes",
            triggers: "Triggers",
            schemas: "Schemas"
        }
    }

    return JSON.stringify(configContent, null, 4);
}

export default pdcscConfigContent;
