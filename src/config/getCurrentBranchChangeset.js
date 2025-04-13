import fs from "fs";
import path from "path";
import chalk from 'chalk';

function getCurrentBranchChangeset(config) {
    let changeset;
    const { currentBranch, mergeBase } = config;
    const hash = mergeBase ? '_' + mergeBase.substr(0, 8) : '';
    const regex1 = new RegExp(`^\\d+${hash}_${currentBranch}\\.txt$`);
    const regex21 = new RegExp(`^\\d+_`);
    const regex22 = new RegExp(`${currentBranch}\\.txt$`);
    const { changesetsPath } = config.paths;
    const fileNames = fs.readdirSync(changesetsPath);
    let candidateChangeset;

    for (const fileName of fileNames) {
        if (regex21.test(fileName) && regex22.test(fileName)) {
            if (candidateChangeset) {
                console.log(`Skipped candidate changeset ${chalk.cyan(path.parse(candidateChangeset).name)}`);
            }

            candidateChangeset = fileName;
        }

        if (regex1.test(fileName)) {
            changeset = fileName;

            console.log(`Found existing changeset ${chalk.cyan(path.parse(changeset).name)}`);

            break;
        }
    }

    if (!changeset && candidateChangeset) {
        changeset = candidateChangeset;

        console.log(`Found candidate changeset ${chalk.cyan(path.parse(changeset).name)}.`);
    }

    return changeset;
}

export default getCurrentBranchChangeset;