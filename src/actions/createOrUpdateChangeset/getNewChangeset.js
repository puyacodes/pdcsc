import path from "path";
import { Exception } from "@locustjs/exception";
import chalk from "chalk";

function getNewChangeset(config) {
    let changeset;
    let changesetFilePath;

    try {
        const { now, currentBranch, mergeBase } = config;
        const { changesetsPath } = config.paths;

        //TODO: Done
        // add branch hash to changesets file name
        const hash = mergeBase ? '_' + mergeBase.substr(0, 8): '';
        
        changeset = `${now}${hash}_${currentBranch}.txt`;
        changesetFilePath = path.join(changesetsPath, changeset);
    } catch (ex) {
        throw new Exception(`Generating new changeset ${chalk.cyan(changeset)} failed`, ex);
    }

    return { changeset, changesetFilePath }
}

export default getNewChangeset;