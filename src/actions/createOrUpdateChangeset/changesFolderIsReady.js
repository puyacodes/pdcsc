import { isObject } from "@locustjs/base";
import simpleGit from "simple-git";

async function changesFolderIsReady(config) {
    config.debug1(`Checking if ${config.paths.changesetFolderName} folder is ready (does not have uncommitted changes) ...`)

    const git = simpleGit();
    const changes = await git.status();
    const statuses = ['not_added', 'conflicted', 'created', 'deleted', 'ignored', 'modified', 'renamed'];
    let result = true;

    config.debug2("git status", changes)

    if (isObject(changes)) {
        for (let status of statuses) {
            const changeList = changes[status]

            if (Array.isArray(changeList)) {
                if (changeList.find(file => file.startsWith(`${config.paths.changesetFolderName}`))) {
                    result = false;
                    break;
                }
            }
        }
    }

    if (result) {
        config.debug1(`${config.paths.changesetFolderName} folder is ok.`)
    } else {
        config.debug1(`${config.paths.changesetFolderName} has changes in its changesets.`)
    }

    return result;
}

export default changesFolderIsReady;
