import { Exception } from "@locustjs/exception";
import simpleGit from "simple-git";

async function initGitRepo(config) {
    let error;

    config.debug(`Checking if we are a git repo ...\n`);

    const git = simpleGit();

    let hasGitRepo = await git.checkIsRepo();

    if (!hasGitRepo) {
        try {
            await git.init();

            console.log("Initialized a new git repository successfully.");
        } catch (ex) {
            error = new Exception("Initializing git repository failed", ex);
        }
    } else {
        config.debug("We are in a git repo.");
    }

    return error;
}

export default initGitRepo;
