import path from "path";

function getNewChangeset(config) {
    let changeset;
    let changesetFilePath;

    const { now, currentBranch, mergeBase } = config;
    const { changesetsPath } = config.paths;

    //TODO: Done
    // add branch hash to changesets file name
    const hash = mergeBase ? '_' + mergeBase.substr(0, 8): '';
    
    changeset = `${now}${hash}_${currentBranch}.txt`;
    changesetFilePath = path.join(changesetsPath, changeset);

    return { changeset, changesetFilePath }
}

export default getNewChangeset;