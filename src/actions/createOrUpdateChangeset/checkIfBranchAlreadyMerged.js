import { isNullOrEmpty } from "@locustjs/base";
import { Exception } from "@locustjs/exception";

function checkIfBranchAlreadyMerged(config) {
    const { realCurrentBranch, masterBranchName } = config;

    try {
        config.debug("Checking if branch already merged ...")
        
        const result = config.exec(`git merge-base --is-ancestor ${realCurrentBranch} ${masterBranchName} && echo "merged" || echo "not merged"`);

        if (result == "merged") {
            config.error = new Exception(`branch ${realCurrentBranch} already merged into ${masterBranchName}.
Changing already merged branches is forbidden.
Please create a new branch.`);
        } else {
            config.debug("Branch is ok (not merged).");
        }
    } catch (ex) {
        config.error = new Exception("Error happened while checking branch with origin", ex);
    }

    return isNullOrEmpty(config.error);
}

export default checkIfBranchAlreadyMerged;