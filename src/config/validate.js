import fs from "fs";
import path from "path";
import { isEmpty, isObject } from "@locustjs/base";
import chalk from "chalk";

function validate(config) {
    let error;

    do {
        if (!isObject(config.paths)) {
            config.paths = {}
        }

        if (isEmpty(config.paths.backupDir)) {
            config.paths.backupDir = "C:\\temp\\";
        }

        if (isEmpty(config.paths.changesetFolderName)) {
            config.paths.changesetFolderName = "Changes";
        }

        if (isEmpty(config.paths.scriptsFolderName)) {
            config.paths.scriptsFolderName = "Scripts";
        }

        if (config.changeset) {
            config.changesetFilePath = path.join(config.paths.changesetsPath, config.changeset);

            if (!fs.existsSync(config.changesetFilePath)) {
                if (!config.changeset.endsWith(".txt") && config.changeset.lastIndexOf(".") < 0) {
                    const _changeset = `${config.changeset}.txt`;
                    const _changesetFilePath = path.join(config.paths.changesetsPath, _changeset);

                    if (!fs.existsSync(_changesetFilePath)) {
                        error = `Changeset file ${chalk.cyan(config.changeset)} or ${chalk.cyan(_changeset)} not found.`;
                    } else {
                        config.changeset = _changeset;
                        config.changesetFilePath = _changesetFilePath;
                    }
                } else {
                    error = `Changeset file ${chalk.cyan(config.changeset)} not found.`;
                }
            }
        }

        if (error) {
            break;
        }
        
        if (isEmpty(config.pipeline)) {
            config.pipeline = "gitlabs";
        }

        config.pipeline = config.pipeline.toLowerCase();

        if (config.pipeline != "gitlabs" && config.pipeline != "azuredevops") {
            error = `Unsupported cicd: ${chalk.yellow(config.pipeline)}`;
            break;
        }

        if (isEmpty(config.backupDbName)) {
            config.backupDbName = "TempBackupDB";
        }

        if (isEmpty(config.masterBranchName)) {
            config.masterBranchName = "origin/main";
        }

        if (isEmpty(config.changesetsTableName)) {
            config.changesetsTableName = "Changesets";
        }

        if (isEmpty(config.appVersionFormat)) {
            config.appVersionFormat = "YYYY-MM-DD HH:mm:ss";
        }

        if (isEmpty(config.timestampLocale)) {
            config.timestampLocale = "en";
        }

        if (isEmpty(config.appVersionSprocName)) {
            config.appVersionSprocName = "dbo.getAppVersion";
        }

        if (config.cliMode) {
            break;
        }

        if (isEmpty(config.database.server)) {
            error = `database server not specified`;
        } else if (isEmpty(config.database.user)) {
            error = `database user not specified`;
        } else if (isEmpty(config.database.password)) {
            error = `database password not specified`;
        } else if (isEmpty(config.database.database)) {
            error = `database not specified`;
        }
    } while (false)

    return error;
}


export default validate;