import testAndCommitChangeset from "./testAndCommitChangeset.js";
import extractSections from "./extractSections.js";
import finalizeChangeset from "./finalizeChangeset.js";
import generateDropScriptsIfRequested from "./generateDropScriptsIfRequested.js";
import checkUncommittedChanges from "./checkUncommittedChanges.js";
import getOrCreateChangeset from "./getOrCreateChangeset.js";
import getChangedFiles from "./getChangedFiles.js";
import compareWithOrigin from "./compareWithOrigin.js";
import saveFinalScript from "./saveFinalScript.js";
import updateSections from "./updateSections.js";
import checkIfBranchAlreadyMerged from "./checkIfBranchAlreadyMerged.js";
import updateChangesetTimestampIfNeeded from "./updateChangesetTimestampIfNeeded.js";
import getAllSqlFiles from "../../utils/getAllSqlFiles.js";
import restoreChangesIfNeeded from "./restoreChangesIfNeeded.js";
import chalk from "chalk";

async function createOrUpdateChangeset(config) {
    if (!config.debugMode) {
        console.log((config.oldChangeset ? "Updating" : "Creating") + ` changeset ...\n  ${chalk.gray("This may take a while. Please wait.")}`);
    }

    try {
        do {
            if (!await compareWithOrigin(config)) {
                break
            }

            // TODO: Done
            // if current branch already merged with origin, exit.
            // we should not allow changing previous branches.
            // we show a message that user should create a new branch
            // if he intends to change previous branches.

            if (!checkIfBranchAlreadyMerged(config)) {
                break
            }

            // Todo: Done
            // we should update changeset timestamp always.

            if (!await updateChangesetTimestampIfNeeded(config)) {
                break
            }

            if (!await checkUncommittedChanges(config)) {
                break;
            }

            getOrCreateChangeset(config);

            extractSections(config);

            getChangedFiles(config);

            // Todo: Done
            // merge deletedFiles from getChangedFiles() and config.uncommittedChanges.deleted

            const allFiles = getAllSqlFiles(config.paths.scriptsPath);

            if (!updateSections(config, allFiles)) {
                break;
            }

            // Todo
            // detect and warn about changeset items that cannot be found in file system

            generateDropScriptsIfRequested(config);

            // Todo: Done
            // skip test and commit if changeset has no new changes

            if (finalizeChangeset(config)) {
                if (!await saveFinalScript(config, allFiles)) {
                    break;
                }

                if (!await testAndCommitChangeset(config)) {
                    break;
                }
            }

            console.log('Operation completed.')
        } while (false);
    } catch (ex) {
        config.error = ex;
    } finally {
        restoreChangesIfNeeded(config)
    }


    return config.error;
}

export default createOrUpdateChangeset;