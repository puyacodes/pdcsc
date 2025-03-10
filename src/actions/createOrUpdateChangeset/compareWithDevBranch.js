import { Exception } from "@locustjs/exception";
import simpleGit from "simple-git";

async function compareWithDevBranch(config) {
    let result = true;
    const { masterBranchName, realBranchName } = config
    const git = simpleGit();

    if (masterBranchName) {
        try {
            do {
                git.checkIsRepo((err, isRepo) => {
                    if (err || !isRepo) {
                        console.log('This is not a git repository.');
                        result = false;
                    };
                });

                if (!result) {
                    break;
                }

                console.log("Fetching latest updates from origin ...");

                const [origin, branch] = masterBranchName.split("/");

                config.debug2({ origin, branch })

                git.fetch(origin, branch);

                const branches = await git.branch(['-r']);

                config.debug2('remote branches', branches)

                if (!branches.all || !branches.all.includes(masterBranchName)) {
                    throw new Exception(`Remote branch ${masterBranchName} does not exist.`);
                }

                const base = await git.raw(['merge-base', realBranchName, masterBranchName]);

                config.debug2('merge-base =', base)
                config.debug3(`getting git logs from base ${base} to ${masterBranchName}...`)
                
                const logs = await git.log({ from: base.trim(), to: masterBranchName });
                
                config.debug2('logs', logs)

                if (logs.total > 0) {
                    console.log(`Your '${realBranchName}' branch is behind ${masterBranchName} by ${logs.total} commits.`);
                    console.log(`Please run "git pull ${masterBranchName}" to sync with the latest changes.`);

                    result = false;
                }
            } while (false);
        } catch (ex) {
            throw new Exception(`Error checking ${masterBranchName} branch:`, ex);
        }
    } else {
        console.log(`no master branch is specified.`);
    }

    return result;
}

export default compareWithDevBranch;