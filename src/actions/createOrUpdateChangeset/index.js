import testAndCommitChangeset from "./testAndCommitChangeset.js";
import validateChangeSetFile from "./validateChangeSetFile.js";
import finalizeChangeset from "./finalizeChangeset.js";
import getDropScripts from "./getDropScripts.js";
import getUserChoice from "./getUserChoice.js";
import getOrCreateChangeset from "./getOrCreateChangeset.js";
import getChangedFiles from "./getChangedFiles.js";
import restoreCommittedChanges from "../../utils/restoreCommittedChanges.js";
import compareWithOrigin from "./compareWithOrigin.js";
import saveFinalScript from "./saveFinalScript.js";
import FileHelper from "../../services/FileHelper/index.js";
import updateSections from "./updateSections.js";
import checkIfBranchAlreadyMerged from "./checkIfBranchAlreadyMerged.js";
import updateChangesetTimestampIfNeeded from "./updateChangesetTimestampIfNeeded.js";
import chalk from "chalk";

async function createOrUpdateChangeset(config) {
    if (!config.debugMode) {
        console.log((config.oldChangeset ? "Updating" : "Creating") + ` changeset ...\n  ${chalk.gray("This may take a while. Please wait.")}`);
    }

    let error = await compareWithOrigin(config);

    if (!error) {
        // TODO: Done
        // if current branch already merged with origin, exit.
        // we should not allow changing previous branches.
        // we show a message that user should create a new branch
        // if he intends to change previous branches.

        error = checkIfBranchAlreadyMerged(config);

        if (!error) {
            // Todo: Done
            // we should update changeset timestamp always.

            error = await updateChangesetTimestampIfNeeded(config);

            if (!error) {
                let userChoice;

                try {
                    const guc = await getUserChoice(config);

                    userChoice = guc.userChoice;

                    if (userChoice) {
                        getOrCreateChangeset(config);

                        const sections = validateChangeSetFile(config);
                        const { finalFiles, deleted } = getChangedFiles(config);
                        const finalDeleteds = [...guc.changes.deleted, ...deleted]

                        // Todo: Done
                        // merge deletedFiles from getChangedFiles() and guc.changes.deleted

                        config.debug3("Current sections", sections);

                        updateSections(config, sections, finalFiles, finalDeleteds);

                        if (guc.generateDrops) {
                            config.debug("Generating drop statements ...");
                        }

                        const drops = guc.generateDrops ? getDropScripts(config, finalDeleteds, config.folders) : "";

                        config.debug3({ drops });

                        // Todo
                        // detect changeset items that cannot be found in file system
                        // generate drop statements for them and remove them from changeset.
                        // warn about this to user.

                        finalizeChangeset(config, sections, drops);

                        // Todo
                        // skip test and comit if changeset has no new changes

                        await saveFinalScript(config, guc.changes.deleted);

                        error = await testAndCommitChangeset(config);

                        if (!error) {
                            console.log('Operation completed.')
                        }
                    }
                } catch (ex) {
                    error = ex;
                } finally {
                    const {
                        scriptTempFilePath,
                        changesetTempFilePath
                    } = config

                    FileHelper.deleteFiles(scriptTempFilePath, changesetTempFilePath);
                }

                if (error && config.isNewChangeset) {
                    // we do not delete changeset script.
                    // changeset scripts are ignored in .gitignore and are not committed.
                    FileHelper.deleteFile(config.finalChangesetFilePath);
                }

                if (error) {
                    if (userChoice === "2") {
                        // restoring back committed changes depends on whether we commited changeset or not.
                        // if the changeset is committed, we should restore 2 level back, otherwise 1 level back

                        restoreCommittedChanges(config.changesetCommitted ? 2 : 1);
                    } else if (config.changesetCommitted) {
                        // user didn't ask to commit sql changes.
                        // only changeset was committed. we should restore only 1 level back.

                        restoreCommittedChanges(1);
                    }
                }
            }
        }
    }

    return error;
}

export default createOrUpdateChangeset;