import { Exception } from "@locustjs/exception";
import simpleGit from "simple-git";
import chalk from 'chalk';
import { isNullOrEmpty } from "@locustjs/base";
import { ActionType } from "../enums";
import promptUser from "./promptUser";

async function compareWithOrigin(config) {
    const { masterBranchName } = config

    do {
        config.debug(`Checking if ${chalk.yellow(masterBranchName)} is valid ...`);

        try {
            config.debug1(`getting remote branches ...`)

            const branches = config.exec(`git branch -r`)
                .split("\n")
                .map(x => x.trim())
                .filter(x => x);

            config.debug2('remote branches', branches)

            if (!branches.includes(masterBranchName)) {
                config.error = new Exception(`Remote branch ${chalk.yellow(masterBranchName)} does not exist.`);

                break;
            }
            
            config.debug(`${masterBranchName} is valid.`);

            config.debug(`Fetching master branch ${masterBranchName} ...`);

            const [origin, branch] = masterBranchName.split("/");

            config.exec(`git fetch ${origin} ${branch}`);

            // await git.fetch(origin, branch);

            // const base = await git.raw(['merge-base', realCurrentBranch, masterBranchName]);
            const base = config.mergeBase;

            config.debug3(`Getting git logs from base ${base} to ${masterBranchName}...`)

            config.debug(`Checking if we are behind ${masterBranchName} ...`);

            // const logs = await git.log({ from: base, to: masterBranchName });

            const logs = config.exec(`git log ${base}..${masterBranchName} --oneline`)
                .split("\n")
                .filter(x => x && x.trim().length > 0);

            config.debug3('\nlogs', logs)

            if (logs.length == 0) {
                config.debug(`We are not behind ${masterBranchName}.`);

                break;
            }

            console.warn(`${chalk.yellow("Warning:")} you are behind ${masterBranchName} by ${logs.length} commits.`);

            if (config.action == ActionType.merge) {
                console.log(`Please run ${chalk.yellow(`git pull ${origin} ${branch} & git merge ${branch}`)} to sync with the latest changes from ${masterBranchName}.`);

                config.error = "Operation aborted.";

                break;
            }

            const userChoice = await promptUser(`\nDo you want to pull/merge ${masterBranchName} (y/n)? `);

            if (userChoice != 'y') {
                config.error = new Exception("Operation aborted.");

                break;
            }

            try {
                config.exec(`git pull ${origin} ${branch}`);

                try {
                    config.exec(`git merge ${branch}`);
                } catch (ex) {
                    config.error = new Exception(`git merge ran into a merge conflict. Please merge/commit the files manually and try again.`, ex);
                }
            } catch (ex) {
                config.error = new Exception(`git pull failed.`, ex);
            }
        } catch (ex) {
            config.error = new Exception(`Error comparing branch with ${masterBranchName}:`, ex);
        }
    } while (false);

    return isNullOrEmpty(config.error);
}

async function c1(config) {
    let error;
    config.debug(`checking if we are in a git repo ...`)

    const git = simpleGit();

    let isRepo = false;

    try {
        isRepo = await git.checkIsRepo();
    } catch (ex) {
        error = ex;
    }

    console.log({ isRepo })
    error = new Error('hi')
    return error;
}

export default compareWithOrigin;
// export default c1;