import simpleGit from "simple-git";

async function c1() {
    let error;
    console.log(`checking if we are in a git repo ...`)
    
    const git = simpleGit();

    let isRepo = false;

    try {
        isRepo = await git.checkIsRepo();
    } catch (ex) {
        error = ex;
    }

    console.log({ isRepo })
}

async function start() {
    const git = simpleGit();
    const branches = await git.branch(['-r']);

    console.log(branches)
}

c1().catch(console.log)