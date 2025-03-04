import { Exception } from "@locustjs/exception";
import { execSync } from "child_process";

function isNotBranchAlreadyMerged({ currentBranch, masterBranchName }) {
    let error;

    try {
        const result = execSync(
            `git merge-base --is-ancestor ${currentBranch} ${masterBranchName} && echo "merged" || echo "not merged"`,
            { encoding: "utf-8" }
        );

        if (result.trim() == "merged") {
            error = new Exception(`branch ${currentBranch} already merged into ${masterBranchName}.
Changing merged branches is forbidden.
Create a new branch from ${currentBranch} if you have any changes.`)
        }
    } catch (ex) {
        error = new Exception("error happened while checking whether branch is already merged or not", ex);
    }

    return error;
}

export default isNotBranchAlreadyMerged;