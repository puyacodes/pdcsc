import testAndCommitChangeset from "./testAndCommitChangeset.js";
import extractSections from "./extractSections.js";
import finalizeChangeset from "./finalizeChangeset.js";
import generateDropScriptsIfRequested from "./generateDropScriptsIfRequested.js";
import checkUncommittedChanges from "./checkUncommittedChanges.js";
import getOrCreateChangeset from "./getOrCreateChangeset.js";
import getChangedFiles from "./getChangedFiles.js";
import compareWithOrigin from "../../utils/compareWithOrigin.js";
import saveFinalScript from "./saveFinalScript.js";
import updateSections from "./updateSections.js";
import checkIfBranchAlreadyMerged from "./checkIfBranchAlreadyMerged.js";
import updateChangesetNameIfNeeded from "./updateChangesetNameIfNeeded.js";
import getAllSqlFiles from "../../utils/getAllSqlFiles.js";
import restoreChangesIfNeeded from "./restoreChangesIfNeeded.js";

async function createOrUpdateChangeset(config) {
    if (!config.debugMode) {
        console.log((config.oldChangeset ? "Updating" : "Creating") + ` changeset ...`);
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
            // we should update changeset timestamp and mergeBase always.

            if (!await updateChangesetNameIfNeeded(config)) {
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

            const allFiles = getAllSqlFiles(config, config.paths.scriptsPath);

            if (!updateSections(config, allFiles)) {
                break;
            }

            // Todo: Done
            // detect and warn about changeset items that cannot be found in file system

            await generateDropScriptsIfRequested(config);

            // Todo: Done
            // skip test and commit if changeset has no new changes
            const canTestAnDcommit = finalizeChangeset(config)

            
            if (canTestAnDcommit) {
                if (!await saveFinalScript(config, allFiles)) {
                    break;
                }
                
                if (!await testAndCommitChangeset(config)) {
                    break;
                }
            } else {
                console.log("Skipped changeset testing. No new changes detected.")
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