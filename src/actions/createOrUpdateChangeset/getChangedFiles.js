import { Exception } from "@locustjs/exception";
import { execSync } from "child_process";
import isValidScriptFile from "./isValidScriptFile";

function getChangedFiles(config) {
    const { currentBranch, masterBranchName } = config;

    try {
        const mergeBase = execSync(
            `git merge-base HEAD ${masterBranchName}`,
            { encoding: "utf-8" }
        ).trim();

        config.debug(`Current Branch: ${currentBranch}, Master Branch: ${masterBranchName}`);
        config.debug(`Merge Base: ${mergeBase}`);

        const modifiedAndAddedFiles = execSync(
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

        const allFiles = [...modifiedAndAddedFiles, ...renamedFiles];
        const finalFiles = allFiles.filter((file) => isValidScriptFile(config, file));

        config.debug("Final .sql files:", finalFiles);

        return finalFiles;
    } catch (ex) {
        throw new Exception(`Error fetching modified and untracked files`, ex);
    }
}

export default getChangedFiles;