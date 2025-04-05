import fs from "fs";
import path from "path";

function getChangesetContent(config) {
    let content;
    const { currentBranch, realBranchName } = config;
    const { changesetsPath } = config.paths;
    const changesetFiles = fs.readdirSync(changesetsPath);

    // Todo
    // we should find changeset based on branchname AND merge-base

    const changeset = changesetFiles.find(file => file.includes(currentBranch) && file.endsWith(".sql"));

    if (changeset) {
        console.log(`Found changeset: ${changeset}`);

        const changesetPath = path.join(changesetsPath, changeset);

        content = fs.readFileSync(changesetPath, "utf-8");
    } else {
        console.warn(`No changeset file found for branch '${realBranchName}'`);
    }

    return content;
}

export default getChangesetContent;