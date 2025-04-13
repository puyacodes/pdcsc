import fs from "fs";
import path from "path";
import moment from "jalali-moment";
import getCurrentBranch from "./getCurrentBranch.js"
import { DbHelperSqlServer } from '../services/DbHelper/index.js';
import { ConsoleLogger } from "@locustjs/logging";
import { Exception } from "@locustjs/exception";
import getCurrentBranchChangeset from "./getCurrentBranchChangeset.js";
import chalk from 'chalk';
import { execSync } from "child_process";

function init(config) {
    if (!config.cliMode) {
        config.db = new DbHelperSqlServer(config.database);
        config.now = moment().locale(config.timestampLocale).format('YYYYMMDDHHmmss');

        const { currentBranch, realBranchName } = getCurrentBranch(config);

        console.log(`Current branch: ${chalk.yellow(realBranchName)}`);

        config.currentBranch = currentBranch;
        config.realBranchName = realBranchName;

        console.log("initializing paths ...")

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
            if (config.debugMode && config.debugLevel.contains("1")) {
                console.log(...args);
            }
        }
        config.debug2 = (...args) => {
            if (config.debugMode && config.debugLevel.contains("2")) {
                console.log(...args);
            }
        }
        config.debug3 = (...args) => {
            if (config.debugMode && config.debugLevel.contains("3")) {
                console.log(...args);
            }
        }
        config.debug4 = (...args) => {
            if (config.debugMode && config.debugLevel.contains("4")) {
                console.log(...args);
            }
        }

        config.debug("getting merge-base ...", { realBranchName, masterBranch: config.masterBranchName })

        config.mergeBase = execSync(
            `git merge-base HEAD ${config.masterBranchName}`,
            { encoding: "utf-8" }
        ).trim();

        if (!config.mergeBase) {
            console.warn(`warning: merge-base for current branch (${realBranchName}) not found!`)
        } else {
            config.debug2('merge-base =', config.mergeBase);
        }

        config.debug("getting current branch changeset ...")

        config.oldChangeset = getCurrentBranchChangeset(config);

        if (config.oldChangeset) {
            config.oldChangesetName = path.parse(config.oldChangeset).name;
            config.oldChangesetFilePath = path.join(config.paths.changesetsPath, config.oldChangeset);
        }

        config.debug4(`config = `, config);
    }
}


export default init;