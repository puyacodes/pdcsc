import fs from "fs";
import path from "path";
import moment from "jalali-moment";
import getBranchName from "../utils/getBranchName.js"
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
        schemas: "Schemas",
        sequences: "Sequences",
        synonyms: "Synonyms",
        queues: "Queues",
        assemblies: "Assemblies",
        statistics: "Statistics",
    }, config.folders)

    config.db = new DbHelperSqlServer(config.database);
    config.minifier = new TSqlMinifier();
    config.uglifier = new NullSqlUglifier();
    config.obfuscator = new NullSqlObfuscator();
    config.now = moment().locale(config.timestampLocale).format('YYYYMMDDHHmmss');
    config.exec = function (cmd) {
        config.debug8(cmd);

        return execSync(cmd, { encoding: "utf-8" }).trim();
    }

    if (!config.cliMode && (config.action != ActionType.apply || config.inPipeline)) {
        const { currentBranch, realCurrentBranch } = getBranchName(config);

        console.log(`Current branch: ${chalk.yellow(realCurrentBranch)}`);

        config.currentBranch = currentBranch;
        config.realCurrentBranch = realCurrentBranch;

        if (!fs.readdirSync(config.paths.scriptsPath).some(folder =>
            Object.values(config.folders).some(f => folder === f)
        )) {
            throw new Exception("Please specify all 'Scripts' subfolders in the 'folders' section of the config file.");
        }

        config.debug("getting merge-base ...", { realCurrentBranch, masterBranch: config.masterBranchName })

        try {
            config.mergeBase = config.exec(`git merge-base HEAD ${config.masterBranchName}`);
        } catch (ex) {
            throw new Exception("Getting merge-base for current branch failed", ex);
        }

        if (!config.mergeBase) {
            throw new Exception(`No merge-base for current branch (${realCurrentBranch}) found. Please use pdcsc in another branch.`);
        } else {
            config.debug1('merge-base', config.mergeBase);
        }

        if (config.action != ActionType.apply) {
            config.debug("getting current branch changeset ...")

            config.oldChangeset = getCurrentBranchChangeset(config);

            if (config.oldChangeset) {
                config.oldChangesetName = path.parse(config.oldChangeset).name;
                config.oldChangesetFilePath = path.join(config.paths.changesetsPath, config.oldChangeset);
            }
        }
    }

    config.debug6(`config = `, config);
}


export default init;