import simpleGit from "simple-git";

async function getAllStatuses(status, exclude, debugMode) {
    const git = simpleGit();

    const status = status ?? await git.status();
    const allStatuses = [];
    const statuses = ['not_added', 'conflicted', 'created', 'deleted', 'ignored', 'modified', 'renamed'];

    statuses.forEach(state => {
        if (Array.isArray(status[state])) {
            if (state != exclude) {
                allStatuses.push(...status[state]);
            }
        }
    });

    if (debugMode) {
        console.log("allStatuses", allStatuses);
    }

    return allStatuses;
}

export default getAllStatuses;
