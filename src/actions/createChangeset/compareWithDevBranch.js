import { Exception } from "@locustjs/exception";
import simpleGit from "simple-git";

async function compareWithDevBranch({ masterBranchName, realBranchName }) {
    let result = true;
    const git = simpleGit();

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

            console.log("Fetching the latest updates from origin...");

            await git.fetch(masterBranchName.split("/")[0], masterBranchName.split("/")[1]);

            const branches = await git.branch(['-r']);

            if (!branches.all.includes(masterBranchName)) {
                throw new Error(`Remote branch ${masterBranchName} does not exist.`);
            }

            const base = await git.raw(['merge-base', realBranchName, masterBranchName]);
            const log = await git.log({ from: base.trim(), to: masterBranchName });

            if (log.total > 0) {
                console.log(`Your branch '${realBranchName}' is behind ${masterBranchName} by ${log.total} commits.`);
                console.log(`Please run git pull ${masterBranchName} to sync with the latest changes.`);
                result = false;
            }
        } while (false);
    } catch (error) {
        console.error(`Error checking the ${masterBranchName} branch:`, error.message || error);
        result = false;
    }

    if (!result) {
        throw new Exception();
    }

    return result;
}

export default compareWithDevBranch;