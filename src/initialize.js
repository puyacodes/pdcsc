import getCurrentBranch from "./utils/getCurrentBranch.js"
import moment from "jalali-moment";
import path from "path";

async function initialize(config) {
    let result;
    
    const { currentBranch, realBranchName } = getCurrentBranch(config);

    if (config.debugMode) {
        console.log(`Current Branch: ${realBranchName}`);
    }

    const now = moment().locale(config.timestampLocale).format('YYYYMMDDHHmmss');

    if (config.debugMode) {
        console.log("now: ", now);
    }

    const changesetPath = path.join(config.basePath, config.paths.changesetFolderName);
    const backupFile = path.join(config.paths.backupDir, `backup-${config.database.databaseName}-temp.bak`);

    config.settings = {
        currentBranch,
        realBranchName,
        changesetPath,
        backupFile,
        now
    }
}

export default initialize;