import fs from "fs";
import path from "path";
import moment from "jalali-moment";
import getCurrentBranch from "./getCurrentBranch.js"
import { DbHelperSqlServer } from '../services/DbHelper/index.js';
import { ConsoleLogger } from "@locustjs/logging";
import { Exception } from "@locustjs/exception";

function init(config) {
    if (!config.cliMode) {
        config.db = new DbHelperSqlServer(config.database);
        config.now = moment().locale(config.timestampLocale).format('YYYYMMDDHHmmss');

        const { currentBranch, realBranchName } = getCurrentBranch(config);

        config.currentBranch = currentBranch;
        config.realBranchName = realBranchName;
        config.paths.changesetsPath = path.join(config.basePath, config.paths.changesetFolderName);
        config.paths.scriptsPath = path.join(config.basePath, config.paths.scriptsFolderName);
        config.paths.backupFile = path.join(config.paths.backupDir, `backup-${config.database.database}-temp.bak`);

        config.folders = Object.assign({
            procedures: "Procedures",
            functions: "Functions",
            tables: "Tables",
            relations: "Relations",
            types: "Types",
            views: "Views",
            indexes: "Indexes",
            triggers: "Triggers",
            schemas: "Schemas"
        }, config.folders)

        if (!fs.readdirSync(config.paths.scriptsPath).some(folder =>
            Object.values(config.folders).some(f => folder === f)
        )) {
            throw new Exception("Please specify all 'Scripts' subfolders in the 'folders' section of the config file.");
        }

        config.logger = new ConsoleLogger({ env: "node" });
        config.debug = (...args) => {
            if (config.debugMode) {
                console.log(...args);
            }
        }
        config.warn = (...args) => {
            if (config.debugMode) {
                console.warn(...args);
            }
        }
        config.log = (...args) => {
            console.logger.log(...args);
        }
        config.danger = (...args) => {
            console.logger.danger(...args);
        }

        config.debug(`config = `, config);
    }
}


export default init;