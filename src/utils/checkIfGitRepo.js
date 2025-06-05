import { Exception } from "@locustjs/exception";
import simpleGit from "simple-git";
import { isNullOrEmpty } from "@locustjs/base";

async function checkIfGitRepo(config) {
    config.debug(`Checking if we are a git repo ...`)

    const git = simpleGit();

    try {
        if (await git.checkIsRepo()) {
            config.debug("We are a git repo.");
        } else {
            config.error = new Exception('We are not a git repository.');
        }
    } catch (ex) {
        config.error = new Exception('We are not a git repository.', ex);
    }

    return isNullOrEmpty(config.error);
}

export default checkIfGitRepo;