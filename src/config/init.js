import path from "path";
import moment from "jalali-moment";
import getCurrentBranch from "./getCurrentBranch.js"
import { DbHelperSqlServer } from '../services/DbHelper/index.js';

function init(config) {
    if (!config.cliMode) {
        const { currentBranch, realBranchName } = getCurrentBranch(config);

        config.db = new DbHelperSqlServer(config.database);
        config.now = moment().locale(config.timestampLocale).format('YYYYMMDDHHmmss');
        config.currentBranch = currentBranch;
        config.realBranchName = realBranchName;
        config.paths.changesetsPath = path.join(config.basePath, config.paths.changesetFolderName);
        config.paths.backupFile = path.join(config.paths.backupDir, `backup-${config.database.database}-temp.bak`);
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

        config.debug(`Current Branch: ${realBranchName}`);
        config.debug("now: ", config.now);
    }
}


export default init;