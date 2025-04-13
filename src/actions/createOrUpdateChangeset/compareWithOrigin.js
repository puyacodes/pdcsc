import { Exception } from "@locustjs/exception";
import simpleGit from "simple-git";
import chalk from 'chalk';
import { isNullOrEmpty } from "@locustjs/base";

async function compareWithOrigin(config) {
    const { masterBranchName, realBranchName } = config

    config.debug(`Initializing simpleGit ...`)

    const git = simpleGit();

    if (masterBranchName) {
        try {
            do {
                config.debug(`Checking if we are a git repo ...`)

                let isRepo = false;

                try {
                    isRepo = await git.checkIsRepo();
                } catch (ex) {
                    config.error = ex;

                    break;
                }

                if (!isRepo) {
                    config.error = 'We are not a git repository.';
                    break;
                } else {
                    config.debug("We are a git repo.");
                }

                config.debug("Fetching origin ...");

                const [origin, branch] = masterBranchName.split("/");

                config.debug2({ origin, branch })

                await git.fetch(origin, branch);

                config.debug("Fetch completed.");
                config.debug(`Checking if master branch ${chalk.yellow(masterBranchName)} is valid ...`);

                const branches = await git.branch(['-r']);

                config.debug4('remote branches', branches)

                if (!branches.all || !branches.all.includes(masterBranchName)) {
                    config.error = `Remote branch ${chalk.yellow(masterBranchName)} does not exist.`;
                    break;
                } else {
                    config.debug("master branch is valid.");
                }

                const base = await git.raw(['merge-base', realBranchName, masterBranchName]);

                config.debug2('merge-base =', base)
                config.debug3(`Getting git logs from base ${base} to ${masterBranchName}...`)

                config.debug("Checking if we are behind master branch ...");

                const logs = await git.log({ from: base.trim(), to: masterBranchName });

                config.debug3('\nlogs', logs)

                if (logs.total > 0) {
                    console.warn(`${chalk.yellow("Warning:")} you are behind ${masterBranchName} by ${logs.total} commits.`);
                    console.log(`Please run ${chalk.yellow(`git pull | git merge | git push`)} to sync with the latest changes from master branch.`);

                    config.error = " ";
                } else {
                    config.debug("We are not behind master branch.");
                }
            } while (false);
        } catch (ex) {
            config.error = new Exception(`Error checking ${masterBranchName} branch:`, ex);
        }
    } else {
        config.error = "no master branch is specified";
    }

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