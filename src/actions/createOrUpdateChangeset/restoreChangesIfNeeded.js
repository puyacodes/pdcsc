import FileHelper from "../../services/FileHelper";
import restoreCommittedChanges from "../../utils/restoreCommittedChanges";

function restoreChangesIfNeeded(config) {
    const {
        scriptTempFilePath,
        changesetTempFilePath,
        changesetCommitted,
        userChoice,
        error
    } = config

    FileHelper.deleteFiles(scriptTempFilePath, changesetTempFilePath);
    
    if (error) {
        if (userChoice === "2") {
            // restoring back committed changes depends on whether we commited changeset or not.
            // if the changeset is committed, we should restore 2 level back, otherwise 1 level back

            restoreCommittedChanges(changesetCommitted ? 2 : 1);
        } else if (changesetCommitted) {
            // user didn't ask to commit sql changes.
            // only changeset was committed. we should restore only 1 level back.

            restoreCommittedChanges(1);
        }
    }
}

export default restoreChangesIfNeeded;