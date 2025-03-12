import testAndCommitChangeset from "./testAndCommitChangeset.js";
import validateChangeSetFile from "./validateChangeSetFile.js";
import finalizeChangeset from "./finalizeChangeset.js";
import getDropScripts from "./getDropScripts.js";
import getUserChoice from "./getUserChoice.js";
import getOrCreateChangeset from "./getOrCreateChangeset.js";
import getChangedFiles from "./getChangedFiles.js";
import restoreCommittedChanges from "../../utils/restoreCommittedChanges.js";
import compareWithDevBranch from "./compareWithDevBranch.js";
import saveFinalScript from "./saveFinalScript.js";
import FileHelper from "../../services/FileHelper/index.js";
import updateSections from "./updateSections.js";
import checkIfBranchAlreadyMerged from "./checkIfBranchAlreadyMerged.js";

async function createOrUpdateChangeset(config) {
    let error = await compareWithDevBranch(config);

    if (!error) {

        // TODO: Done
        // if current branch already merged with origin, exit.
        // we should not allow changing previous branches.
        // we show a message that user should create a new branch
        // if he intends to change previous branches.
        error = checkIfBranchAlreadyMerged(config);

        if (!error) {
            let userChoice;

            try {
                config.debug2("checking changed files ...");

                const guc = await getUserChoice(config);

                userChoice = guc.userChoice;

                if (userChoice) {
                    if (await getOrCreateChangeset(config)) {
                        const sections = validateChangeSetFile(config);
                        const allChanges = getChangedFiles(config);

                        config.debug3("sections = ", sections);

                        config.debug2("updating sections ...");

                        updateSections(config, sections, allChanges);

                        if (guc.generateDrops) {
                            config.debug2("generating drop statements ...");
                        }

                        const drops = guc.generateDrops ? getDropScripts(guc.changes.deleted, config.folders) : "";

                        config.debug2("finalizing changeset ...");

                        finalizeChangeset(config, sections, drops);

                        config.debug2("saving final SQL script ...");

                        await saveFinalScript(config);

                        config.debug2("testing final SQL script and committing changes ...");

                        error = await testAndCommitChangeset(config);
                    }
                }
            } catch (ex) {
                error = ex;
            } finally {
                const { paths } = config;
                const {
                    scriptTempFilePath,
                    changesetTempFilePath
                } = config

                FileHelper.deleteFiles(scriptTempFilePath, changesetTempFilePath, paths.backupFile);
            }

            if (error && config.isNewChangeset) {
                FileHelper.deleteFile(config.changesetFilePath);
            }

            if (error && userChoice === "2") {
                restoreCommittedChanges(config.changesetCommitted ? 2 : 1);
            }
        }
    }

    return error;
}

export default createOrUpdateChangeset;