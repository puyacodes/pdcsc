const simpleGit = require("simple-git");

async function getAllStatuses(props) {
    const git = simpleGit();
    const status = props.status ?? await git.status();
    const allStatuses = [];
    const statuses = ['not_added', 'conflicted', 'created', 'deleted', 'ignored', 'modified', 'renamed'];
    statuses.forEach(state => {
        if (Array.isArray(status[state])) {
            if (state != props.exclude) {
                allStatuses.push(...status[state]);
            }
        }
    });
    if (props.config.options.debugMode) {
        console.log("allStatuses", allStatuses);
    }
    return allStatuses;
}

module.exports = { getAllStatuses }