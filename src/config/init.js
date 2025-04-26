import fs from "fs";
import path from "path";
import moment from "jalali-moment";
import getCurrentBranch from "./getCurrentBranch.js"
import { DbHelperSqlServer } from '../services/DbHelper/index.js';
import { Exception } from "@locustjs/exception";
import getCurrentBranchChangeset from "./getCurrentBranchChangeset.js";
import chalk from 'chalk';
import { execSync } from "child_process";
import { ActionType } from "../enums";
import { TSqlMinifier } from "../services/SqlMinifier";
import { NullSqlUglifier } from "../services/SqlUglifier";
import { NullSqlObfuscator } from "../services/SqlObfuscator";

function init(config) {
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

    config.db = new DbHelperSqlServer(config.database);
    config.minifier = new TSqlMinifier();
    config.uglifier = new NullSqlUglifier();
    config.obfuscator = new NullSqlObfuscator();
    config.now = moment().locale(config.timestampLocale).format('YYYYMMDDHHmmss');

    if (!config.cliMode && config.action != ActionType.apply) {
        let cmd;

        const { currentBranch, realBranchName } = getCurrentBranch(config);

        console.log(`Current branch: ${chalk.yellow(realBranchName)}`);

        config.currentBranch = currentBranch;
        config.realBranchName = realBranchName;

        if (!fs.readdirSync(config.paths.scriptsPath).some(folder =>
            Object.values(config.folders).some(f => folder === f)
        )) {
            throw new Exception("Please specify all 'Scripts' subfolders in the 'folders' section of the config file.");
        }

        config.debug("getting merge-base ...", { realBranchName, masterBranch: config.masterBranchName })

        cmd = `git merge-base HEAD ${config.masterBranchName}`;

        config.debug4(cmd);

        try {
            config.mergeBase = execSync(cmd, { encoding: "utf-8" }).trim();
        } catch (ex) {
            throw new Exception("Getting merge-base for current branch failed", ex);
        }

        if (!config.mergeBase) {
            throw new Exception(`No merge-base for current branch (${realBranchName}) found. Please use pdcsc in another branch.`);
        } else {
            config.debug2('merge-base =', config.mergeBase);
        }

        config.debug("getting current branch changeset ...")

        config.oldChangeset = getCurrentBranchChangeset(config);

        if (config.oldChangeset) {
            config.oldChangesetName = path.parse(config.oldChangeset).name;
            config.oldChangesetFilePath = path.join(config.paths.changesetsPath, config.oldChangeset);
        }
    }

    config.debug6(`config = `, config);
}


export default init;