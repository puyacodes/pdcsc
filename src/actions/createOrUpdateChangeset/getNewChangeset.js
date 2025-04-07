import path from "path";
import { Exception } from "@locustjs/exception";

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
        throw new Exception(`generating new changeset ${changeset} failed`, ex);
    }

    return { changeset, changesetFilePath }
}

export default getNewChangeset;