import fs from "fs";
import path from "path";
import chalk from 'chalk';

function getCurrentBranchChangeset(config) {
    let changeset;
    const { currentBranch, mergeBase } = config;
    const hash = mergeBase ? '_' + mergeBase.substr(0, 8): '';
    const regex = new RegExp(`^\\d+${hash}_${currentBranch}\\.txt$`);
    const { changesetsPath } = config.paths;
    const fileNames = fs.readdirSync(changesetsPath);

    for (const fileName of fileNames) {
        if (regex.test(fileName)) {
            changeset = fileName;

            console.log(`Found existing changeset ${chalk.cyan(path.parse(changeset).name)}`);

            break;
        }
    }

    return changeset;
}

export default getCurrentBranchChangeset;