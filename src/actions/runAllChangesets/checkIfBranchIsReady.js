import getBranchName from "../../utils/getBranchName.js";
import { Exception } from "@locustjs/exception";
import chalk from 'chalk';
import { isNullOrEmpty } from "@locustjs/base";

async function checkIfBranchIsReady(config) {
    const { realCurrentBranch, realTargetBranch } = getBranchName(config);

    do {
        try {
            config.debug(`fetching ${realTargetBranch} ...`);

            const [origin, branch] = realTargetBranch.split("/");

            config.exec(`git fetch ${origin} ${branch}`);

            const base = config.mergeBase;

            if (!base) {
                config.error = `${realCurrentBranch} is not derived from ${realTargetBranch}. apply command with -ip flag is not possible.\nPlease remove -ip flag and apply changes manually.`;
                break;
            }

            config.debug3(`Getting git logs from base ${base} to ${realTargetBranch}...`)

            config.debug(`Checking if we are behind ${realTargetBranch} ...`);

            const logs = config.exec(`git log ${base}..${realTargetBranch} --oneline`)
                .split("\n")
                .filter(x => x && x.trim().length > 0);

            config.debug3('\nlogs', logs)

            if (logs.length == 0) {
                config.debug(`We are not behind ${realTargetBranch}.`);

                break;
            }

            console.warn(`${chalk.yellow("Warning:")} you are behind ${realTargetBranch} by ${logs.length} commits.`);

            console.log(`Please run ${chalk.yellow(`git pull ${origin} ${branch} & git merge ${branch}`)} to sync with the latest changes from ${realTargetBranch}.`);

            config.error = "Operation aborted.";
        } catch (ex) {
            config.error = new Exception(`Error checking if ${realCurrentBranch} is ready to be applied on ${realTargetBranch}:`, ex);
        }
    } while (false);

    return isNullOrEmpty(config.error);
}

export default checkIfBranchIsReady;