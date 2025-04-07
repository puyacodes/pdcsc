import fs from "fs";
import extractDateFromString from "../../utils/extractDateFromString";
import renderChangesetScript from "../../utils/renderChangesetScript";
import chalk from "chalk";
import path from "path";

async function getChangesetContent(config) {
    config.debug("Getting changeset content ...");

    let content;
    const { oldChangeset, oldChangesetFilePath, realBranchName } = config;
    const { changesetsPath } = config.paths;

    // Todo: Done
    // we should find changeset based on branchname AND merge-base

    if (oldChangeset) {
        // Todo: Done
        // we should exit pipeline if we detect our changeset is followed by other changesets
        // i.e. other branches are merged before us (our timestamp is behind them).

        const existingDate = extractDateFromString(oldChangeset);
        const fileNames = fs.readdirSync(changesetsPath);

        if (fileNames.filter(file => file.endsWith(".txt")).some(x => extractDateFromString(x) > existingDate)) {
            console.error(`The changeset ${chalk.cyan(oldChangeset)} is followed by other changesets.`);
            console.error(`Cannot merge branch. Please sync your branch and try again.`);
        } else {
            // Todo: Done
            // we should generate changeset script dynamically, not read it from .sql

            content = await renderChangesetScript(config, oldChangesetFilePath, path.parse(oldChangeset).name);
        }
    } else {
        console.warn(`No changeset was found for branch ${chalk.yellow(realBranchName)}`);
    }

    return content;
}

export default getChangesetContent;