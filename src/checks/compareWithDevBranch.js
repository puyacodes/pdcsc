const simpleGit = require("simple-git");

async function compareWithDevBranch(masterBranchName, realBranchName) {
    const git = simpleGit();
    try {
        git.checkIsRepo((err, isRepo) => {
            if (err || !isRepo) {
                console.log('This is not a git repository.');
                process.exit(1);
            };
        });

        console.log("Fetching the latest updates from origin...");
        await git.fetch(masterBranchName.split("/")[0], masterBranchName.split("/")[1]);

        const branches = await git.branch(['-r']);
        if (!branches.all.includes(`${masterBranchName}`)) {
            throw new Error(`Remote branch ${masterBranchName} does not exist.`);
        }

        const base = await git.raw(['merge-base', `${realBranchName}`, `${masterBranchName}`]);
        const log = await git.log({ from: base.trim(), to: `${masterBranchName}` });

        if (log.total > 0) {
            console.log(`Your branch '${realBranchName}' is behind ${masterBranchName} by ${log.total} commits.`);
            console.log(`Please run git pull ${masterBranchName} to sync with the latest changes.`);
            process.exit(1);
        }
    } catch (error) {
        console.error(`Error checking the ${masterBranchName} branch:`, error.message || error);
        process.exit(1);
    }
}

module.exports = { compareWithDevBranch }