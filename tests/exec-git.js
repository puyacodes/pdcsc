const { execSync } = require("child_process");

function start() {
    const mergeBase = execSync(
        `git merge-base HEAD origin/dev`,
        { encoding: "utf-8" }
    ).trim();
    const renamedFiles = execSync(
        `git diff --name-status --diff-filter=R ${mergeBase} HEAD`,
        { encoding: "utf-8" }
    ).split("\n").filter(x => x).forEach(line => {
        const parts = line.split("\t");
        console.log(parts[1], parts[2])
    })
}

start()