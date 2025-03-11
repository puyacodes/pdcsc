const simpleGit = require("simple-git");

async function start() {
    const git = simpleGit();
    const branches = await git.branch(['-r']);

    console.log(branches)
}

start().catch(console.log)