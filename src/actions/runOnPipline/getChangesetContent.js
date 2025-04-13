import fs from "fs";
import extractDateFromString from "../../utils/extractDateFromString";
import renderChangesetScript from "../../utils/renderChangesetScript";
import chalk from "chalk";
import path from "path";
import { execSync } from "child_process";

async function getChangesetContent(config) {
    config.debug("Getting changeset content ...");

    let content;
    let error;
    const { oldChangeset, oldChangesetFilePath, realBranchName } = config;
    const { changesetsPath } = config.paths;

    // Todo: Done
    // we should find changeset based on branchname AND merge-base

    if (oldChangeset) {
        const existingDate = extractDateFromString(config, oldChangeset);

        if (!existingDate) {
            console.warn(chalk.yellow(`Changeset has no date! checking other commits skipped!`));
        } else {

            // Todo: Done
            // if there is a git commit after last pdcsc execution,
            // we should stop pipeline and generate error.
            // user must always use pdcsc.
            const lastCommit = execSync('git log --pretty=format:"%s" HEAD^..HEAD ', { encoding: "utf-8" }).trim();

            config.debug("Last commit = " + lastCommit);

            if (lastCommit && !lastCommit.startsWith('pdcsc: changeset timestamp updated')) {
                error = `Changeset is not up-to-date (other commits found after last changeset push).
    Please update your changeset and try again.`
            } else {
                // Todo: Done
                // we should exit pipeline if we detect our changeset is followed by other changesets
                // i.e. other branches are merged before us (our timestamp is behind them).

                const fileNames = fs.readdirSync(changesetsPath);

                if (fileNames.filter(file => file.endsWith(".txt")).some(x => extractDateFromString(config, x) > existingDate)) {
                    error = `The changeset ${chalk.cyan(oldChangeset)} is followed by other changesets.
    Cannot merge branch. Please sync your branch and try again.`;
                } else {
                    // Todo: Done
                    // we should generate changeset script dynamically, not read it from .sql

                    const cr = await renderChangesetScript(config, oldChangesetFilePath, path.parse(oldChangeset).name);

                    if (cr.error) {
                        error = cr.error
                    } else if (cr.hasAnything) {
                        content = cr.script;
                    } else {
                        error = 'Changeset is empty and has no changes.';
                    }
                }
            }
        }
    } else {
        console.warn(chalk.yellow(`No changeset found for branch ${chalk.yellow(realBranchName)}`));
    }

    return { content, error };
}

export default getChangesetContent;