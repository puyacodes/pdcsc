const { execSync } = require("child_process");

function restoreCommitedChanges(num) {
    execSync(
        `git reset --mixed HEAD~${num ?? 1}`,
        { encoding: "utf-8" }
    ).trim();
    console.log("All commited changes are restored.");
}

module.exports = { restoreCommitedChanges }