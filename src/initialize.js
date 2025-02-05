const { compareWithDevBranch } = require("./checks/compareWithDevBranch.js");
const validateConfig = require('./validations/validateConfig.js');
const { checkForUpdate } = require('./checks/checkForUpdate.js');
let moment = require("jalali-moment");
const { execSync } = require("child_process");
const path = require("path");

async function initialize(config) {
    let currentBranch;
    let realBranchName;
    let timestampLocale;
    let now;
    let changesetPath;
    let appVersionFormat;
    let backupFile;
    let masterBranchName;

    validateConfig(config);

    await checkForUpdate(config);

    if (config.options.runOnPipline) {
        if (config.pipeline === "gitlabs") {
            currentBranch = process.env.CI_COMMIT_REF_NAME.trim().replace("/", "-");
            realBranchName = process.env.CI_COMMIT_REF_NAME;
        } else if (config.pipeline === "azuredevops") {
            currentBranch = process.env.CI_COMMIT_REF_NAME.trim().replace("/", "-");
            realBranchName = process.env.CI_COMMIT_REF_NAME;
        }
        if (config.options.debugMode) {
            console.log(`Current Branch: ${realBranchName}`);
        }
    } else {
        currentBranch = execSync("git rev-parse --abbrev-ref HEAD", { encoding: "utf-8" }).trim().replace("/", "-");
        realBranchName = execSync("git rev-parse --abbrev-ref HEAD", { encoding: "utf-8" }).trim();
    }

    now = moment().locale(config.paths.timestampLocale).format('YYYYMMDDHHmmss');

    if (config.options.debugMode) {
        console.log("now:", now);
    }

    const { paths } = config;

    changesetPath = path.join(config.basePath, paths.changesetFolderName);
    appVersionFormat = paths.appVersionFormat;
    backupFile = path.join(paths.backupDir, `backup-${config.database.databaseName}-temp.bak`);
    timestampLocale = paths.timestampLocale;

    masterBranchName = paths.masterBranchName ?? 'origin/dev';

    //credentialsString = `-S ${server} -U ${user} -P ${password}`;

    if (!config.options.runOnPipline && !config.options.runAllChangesets) {
        await compareWithDevBranch(config.paths.masterBranchName, realBranchName);
    }

    let result = { currentBranch, realBranchName, timestampLocale, now, changesetPath, appVersionFormat, backupFile, masterBranchName }

    return result
}

module.exports = { initialize }