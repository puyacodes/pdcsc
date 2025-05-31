import { Exception } from "@locustjs/exception";
import { execSync } from "child_process";
import isValidScriptFile from "./isValidScriptFile";

function getChangedFiles(config) {
    const { masterBranchName } = config;

    config.debug("Getting all changes in .sql files ...");

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
            `git diff --name-status --diff-filter=R ${mergeBase} HEAD`,
            { encoding: "utf-8" }
        )
            .split("\n")
            .filter(x => x).map(line => {
                const parts = line.split("\t");

                return { old: parts[1], new: parts[2] }
            });

        const deletedFiles = execSync(
            `git diff --name-only --diff-filter=D ${mergeBase} HEAD`,
            { encoding: "utf-8" }
        )
            .split("\n")
            .map(file => file.trim())
            .filter(file => isValidScriptFile(config, file));

        config.debug2("\nrenamed files", renamedFiles);
        config.debug2("\ndeleted files", deletedFiles);

        const allFiles = [...modifiedAndAddedFiles, ...renamedFiles.map(x => x.new)];
        const finalChanges = allFiles.filter(file => isValidScriptFile(config, file));

        config.debug2("\nFinal changes", finalChanges);

        config.finalDeleteds = [...config.uncommittedChanges.deleted, ...deletedFiles]
        config.finalChanges = finalChanges;
        config.renamedFiles = renamedFiles;
    } catch (ex) {
        throw new Exception(`Error extracting changes from git logs`, ex);
    }
}

export default getChangedFiles;