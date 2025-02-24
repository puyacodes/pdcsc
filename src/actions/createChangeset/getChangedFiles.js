import { Exception } from "@locustjs/exception";
import { execSync } from "child_process";

function getChangedFiles({ debug, currentBranch }) {
    try {
        const mergeBase = execSync(
            `git merge-base HEAD origin/dev`,
            { encoding: "utf-8" }
        ).trim();

        if (debug) {
            console.log(`Current Branch: ${currentBranch}`);
            console.log(`Merge Base: ${mergeBase}`);
        }

        const modifiedFiles = execSync(
            `git diff --name-only --diff-filter=MA ${mergeBase} HEAD`,
            { encoding: "utf-8" }
        )
            .split("\n")
            .map((file) => file.trim())
            .filter((file) => file);

        const renamedFiles = execSync(
            `git diff --name-only --diff-filter=R ${mergeBase} HEAD`,
            { encoding: "utf-8" }
        )
            .split("\n")
            .map((file) => file.trim())
            .filter((file) => file);

        const deletedFiles = execSync(
            `git diff --name-only --diff-filter=D ${mergeBase} HEAD`,
            { encoding: "utf-8" }
        )
            .split("\n")
            .map((file) => file.trim())
            .filter((file) => file);

        const allFiles = [...modifiedFiles, ...renamedFiles];
        return allFiles;
    } catch (ex) {
        throw new Exception(`Error fetching modified and untracked files`, ex);
    }
}

export default getChangedFiles;