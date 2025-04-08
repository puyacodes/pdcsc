import simpleGit from "simple-git";
import filterChanges from "./filterChanges";

async function getUncommittedSqlChanges(config, exclude) {
    const git = simpleGit();
    const changes = await git.status();
    const statuses = ['not_added', 'conflicted', 'created', 'deleted', 'ignored', 'modified', 'renamed'];
    const result = {}
    const all = [];

    config.debug2("git status", changes)

    statuses.filter(state => state != exclude)
        .forEach(state => {
            if (Array.isArray(changes[state])) {
                result[state] = filterChanges(config, changes[state])

                all.push(...result[state]);
            }
        });

    result.all = all;

    return result;
}

export default getUncommittedSqlChanges;
