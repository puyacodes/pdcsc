import { isNullOrEmpty } from "@locustjs/base";
import { Exception } from "@locustjs/exception";
import { execSync } from "child_process";

function checkIfBranchAlreadyMerged(config) {
    const { realBranchName, masterBranchName } = config;

    try {
        config.debug("Checking if branch alrady merged ...")
        
        const result = execSync(
            `git merge-base --is-ancestor ${realBranchName} ${masterBranchName} && echo "merged" || echo "not merged"`,
            { encoding: "utf-8" }
        );

        if (result.trim() == "merged") {
            config.error = `branch ${realBranchName} already merged into ${masterBranchName}.
Changing already merged branches is forbidden.
Please create a new branch.`;
        } else {
            config.debug("Branch is ok (not merged).");
        }
    } catch (ex) {
        config.error = new Exception("Error happened while checking branch with origin", ex);
    }

    return isNullOrEmpty(config.error);
}

export default checkIfBranchAlreadyMerged;