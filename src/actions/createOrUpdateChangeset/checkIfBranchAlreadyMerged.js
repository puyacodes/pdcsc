import { Exception } from "@locustjs/exception";
import { execSync } from "child_process";

function checkIfBranchAlreadyMerged(config) {
    let error;
    const { realBranchName, masterBranchName } = config;

    try {
        config.debug("Checking if branch alrady merged ...")
        
        const result = execSync(
            `git merge-base --is-ancestor ${realBranchName} ${masterBranchName} && echo "merged" || echo "not merged"`,
            { encoding: "utf-8" }
        );

        if (result.trim() == "merged") {
            error = `branch ${realBranchName} already merged into ${masterBranchName}.
Changing already merged branches is forbidden.
Please create a new branch.`;
        } else {
            config.debug("Branch is ok (not merged).");
        }
    } catch (ex) {
        error = new Exception("error happened while checking branch with origin", ex);
    }

    return error;
}

export default checkIfBranchAlreadyMerged;