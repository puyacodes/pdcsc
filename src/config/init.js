import fs from "fs";
import path from "path";
import moment from "jalali-moment";
import getCurrentBranch from "./getCurrentBranch.js"
import { DbHelperSqlServer } from '../services/DbHelper/index.js';
import { ConsoleLogger } from "@locustjs/logging";
import { Exception } from "@locustjs/exception";
import { DebugLevel } from "../enums.js";
import { isString } from "@locustjs/base";

function getDebugArgs(args) {
    const _args = [];

    for (let i = 0; i < args.length; i++) {
        let arg = args[i]

        if (isString(arg) && i == 0) {
            arg = '\n\t' + arg;
        }

        _args.push(arg)
    }

    return _args;
}

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
        config.debug1 = (...args) => {
            if (config.debugMode && (config.debugLevel == DebugLevel.Level1 || config.debugLevel == DebugLevel.Level2 || config.debugLevel == DebugLevel.Level3)) {
                console.log(...getDebugArgs(args));
            }
        }
        config.debug2 = (...args) => {
            if (config.debugMode && (config.debugLevel == DebugLevel.Level2 || config.debugLevel == DebugLevel.Level3)) {
                console.log(...getDebugArgs(args));
            }
        }
        config.debug3 = (...args) => {
            if (config.debugMode && config.debugLevel == DebugLevel.Level3) {
                console.log(...getDebugArgs(args));
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

        config.debug3(`config = `, config);
    }
}


export default init;