import { Exception } from "@locustjs/exception";
import { execSync } from "child_process";
import isValidScriptFile from "./isValidScriptFile";

function getChangedFiles(config) {
    const { masterBranchName } = config;

    config.debug("Getting uncommitted .sql files ...");

    try {
        const mergeBase = execSync(
            `git merge-base HEAD ${masterBranchName}`,
            { encoding: "utf-8" }
        ).trim();

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

        config.debug2("deleted files", deletedFiles);

        const allFiles = [...modifiedAndAddedFiles, ...renamedFiles];
        const finalFiles = allFiles.filter((file) => isValidScriptFile(config, file));

        config.debug2("Final changes", finalFiles);

        return { finalFiles, deleted };
    } catch (ex) {
        throw new Exception(`Error fetching modified and untracked files`, ex);
    }
}

export default getChangedFiles;