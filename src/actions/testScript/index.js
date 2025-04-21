import chalk from "chalk";
import createErrorLog from "../../utils/createErrorLog.js";
import backupMasterDatabase from "./backupMasterDatabase.js";
import dropTempDb from "./dropTempDb.js";
import executeScript from "./executeScript.js";
import restoreTempDatabase from "./restoreTempDatabase.js";

async function testScript(config, script) {
    let error;

    try {
        await backupMasterDatabase(config)
        await restoreTempDatabase(config);
        await executeScript(config, script);
    } catch (ex) {
        error = createErrorLog(config, ex);
    } finally {
        await dropTempDb(config);
    }

    if (error) {
        config.debug(chalk.red("\tFailed"));
    } else {
        config.debug(chalk.green("\tPassed"));
    }

    return error;
}

export default testScript;