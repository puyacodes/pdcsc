import { Exception } from "@locustjs/exception";
import { execSync } from "child_process";

function checkIfBranchAlreadyMerged(config) {
    let error;
    const { realBranchName, masterBranchName } = config;

    try {
        const result = execSync(
            `git merge-base --is-ancestor ${realBranchName} ${masterBranchName} && echo "merged" || echo "not merged"`,
            { encoding: "utf-8" }
        );

        if (result.trim() == "merged") {
            error = new Exception(`branch ${realBranchName} already merged into ${masterBranchName}.
Changing merged branches is forbidden.
Create a new branch from ${realBranchName} if you have any new changes.`)
        }
    } catch (ex) {
        error = new Exception("error happened while checking whether branch is already merged or not", ex);
    }

    return error;
}

export default checkIfBranchAlreadyMerged;