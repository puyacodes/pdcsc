import { Exception } from "@locustjs/exception";
import simpleGit from "simple-git";

async function compareWithDevBranch(config) {
    let error;
    const { masterBranchName, realBranchName } = config
    const git = simpleGit();

    if (masterBranchName) {
        try {
            do {
                config.debug2(`checking if we are in a git repo ...`)

                let isRepo = false;

                try {
                    isRepo = await git.checkIsRepo();
                } catch (ex) {
                    error = ex;
                }

                if (error) {
                    break;
                }

                if (!isRepo) {
                    console.log('This is not a git repository.');
                    break;
                }

                console.log("Fetching latest updates from origin ...");

                const [origin, branch] = masterBranchName.split("/");

                config.debug2({ origin, branch })

                await git.fetch(origin, branch);

                const branches = await git.branch(['-r']);

                config.debug3('remote branches', branches)

                if (!branches.all || !branches.all.includes(masterBranchName)) {
                    error = new Exception(`Remote branch ${masterBranchName} does not exist.`);
                    break;
                }

                const base = await git.raw(['merge-base', realBranchName, masterBranchName]);

                config.debug2('merge-base =', base)
                config.debug3(`getting git logs from base ${base} to ${masterBranchName}...`)

                const logs = await git.log({ from: base.trim(), to: masterBranchName });

                config.debug3('logs', logs)

                if (logs.total > 0) {
                    console.log(`Your '${realBranchName}' branch is behind ${masterBranchName} by ${logs.total} commits.`);
                    console.log(`Please run "git pull ${masterBranchName}" to sync with the latest changes.`);

                    error = ".";
                }
            } while (false);
        } catch (ex) {
            error = new Exception(`Error checking ${masterBranchName} branch:`, ex);
        }
    } else {
        console.log(`no master branch is specified.`);
    }

    return error;
}

async function c1(config) {
    let error;
    config.debug2(`checking if we are in a git repo ...`)

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

export default compareWithDevBranch;
// export default c1;