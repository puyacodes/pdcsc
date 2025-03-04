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

async function createChangeset(config) {
    let error;

    if (await compareWithDevBranch(config)) {
        // TODO: if current branch already merged with origin, exit.
        // we should not allow changing previous branches. we show a message
        // that user should create a new branch if he intends to change prev
        // branches

        let userChoice;

        try {
            const guc = await getUserChoice(config);

            userChoice = guc.userChoice;

            if (userChoice) {
                if (await getOrCreateChangeset(config)) {
                    const sections = validateChangeSetFile(config);
                    const allChanges = getChangedFiles(config);

                    updateSections(config, sections, allChanges);

                    const drops = guc.generateDrops ? getDropScripts(guc.changes.deleted, config.folders) : "";

                    finalizeChangeset(sections, drops);

                    saveFinalScript(config);

                    error = await testAndCommitChangeset(config);
                }
            }
        } catch (ex) {
            error = ex;
        }

        if (error && config.isNewChangeset) {
            FileHelper.deleteFile(config.changesetFilePath);
        }

        if (error && userChoice === "2") {
            restoreCommittedChanges(config.changesetCommitted ? 2 : 1);
        }
    }

    return error;
}

export default createChangeset;