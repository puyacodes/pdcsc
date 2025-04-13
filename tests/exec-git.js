const { execSync } = require("child_process");

function getMergeBase() {
    const mergeBase = execSync(
        `git merge-base HEAD origin/dev`,
        { encoding: "utf-8" }
    ).trim();
    
    return mergeBase;
}
function showRenamedFiles() {
    const mergeBase = getMergeBase();
    const renamedFiles = execSync(
        `git diff --name-status --diff-filter=R ${mergeBase} HEAD`,
        { encoding: "utf-8" }
    ).split("\n").filter(x => x).forEach(line => {
        const parts = line.split("\t");
        
        console.log(parts[1], parts[2])
    });
}
function getRemoteBranches() {
    const branches = execSync(
        `git branch -r`,
        { encoding: "utf-8" }
    ).trim()
    .split("\n")
    .map(x => x.trim())
    .filter(x => x);
    //branches.forEach(console.log)
    console.log(branches)
}
function getLog() {
    const mergeBase = getMergeBase();
    const logs = execSync(
        `git log ${mergeBase}..origin/dev --oneline`,
        { encoding: "utf-8" }
    ).trim().split("\n");
    //branches.forEach(console.log)
    console.log(logs)
}
function start() {
    //getMergeBase();
    // getRemoteBranches();
    getLog();
}

start()