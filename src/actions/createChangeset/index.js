import processChangeset from "./ProcessChangeset.js";
import backupAndRun from "./backupAndRun";
import { validateChangedFiles } from "../../validations/validateChangedFiles.js";
import { validateChangeSetFile } from "../../validations/validateChangeSetFile.js";
import { isValidScriptFile } from "../../validations/isValidScriptFile.js";
import { categorizeFiles } from "../../startup/categorizeFiles.js";
import { generateChangesetContent } from "../../startup/generateChangesetContent.js";
import { getAppVersion } from "../../utils/getAppVersion.js";
import { getDropScripts } from "../../utils/getDropScripts.js";
import { getUserChoice } from "../../startup/getUserChoice.js";
import { generateFile } from "../../startup/generateFile.js";
import { getChangedFiles } from "../../utils/getChangedFiles.js";
import restoreCommitedChanges from "../../utils/restoreCommitedChanges.js";
import { BackupAndRunException } from "../../exceptions";
import compareWithDevBranch from "./compareWithDevBranch.js";
import simpleGit from "simple-git";
import fs from "fs";
import path from "path";

const git = simpleGit();

let tempSections = {
    customStart: "",
    procedures: [],
    functions: [],
    tables: [],
    relations: [],
    types: [],
    views: [],
    indexes: [],
    triggers: [],
    schemas: [],
    customEnd: ""
};
let userChoice;
let hasContent;
let changesetContent;

async function createChangeset(config) {
    if (await compareWithDevBranch(config.settings)) {
        let error;

        try {
            const status = await git.status();
            userChoice = await getUserChoice(status, config.folders, config);

            if (userChoice === undefined) {
                process.exit(1);
            }
            if (!config.changesetFile) {
                config.changesetFile = await generateFile(config.settings.changesetPath, config.settings.now, config);
            }
            const cleanFilename = path.parse(config.changesetFile).name;
            const tempFileName = `${path.parse(config.changesetFile).name}~`;
            const changesetTempFile = `${path.parse(config.changesetFile).name}~.txt`;
            const changesetFilePath = path.join(config.settings.changesetPath, `${cleanFilename}.txt`);
            const changesetTempFilePath = path.join(config.settings.changesetPath, changesetTempFile);
            const tempScriptFilePath = path.join(config.settings.changesetPath, `${cleanFilename}~.sql`);
            const scriptFilePath = path.join(config.settings.changesetPath, `${cleanFilename}.sql`);

            if (fs.existsSync(changesetFilePath)) {
                const deletedFiles = [];
                if (status.deleted.length > 0) {
                    validateChangedFiles({
                        status: status.deleted,
                        listName: deletedFiles,
                        commit: false,
                        folders: config.folders,
                        config
                    });
                }

                tempSections = validateChangeSetFile({
                    changesetFilePath: changesetFilePath,
                    newContent: null,
                    deletedFiles: deletedFiles,
                    hasContent: hasContent,
                    tempSections: tempSections
                });

                const changedFiles = getChangedFiles({ status, debug: config.debugMode, currentBranch: config.settings.currentBranch });
                const filteredFiles = changedFiles.filter((file) => isValidScriptFile({ config, file }));
                
                if (config.debugMode) {
                    console.log("Filtered Changed Files:", filteredFiles);
                    console.log("Filtered Deleted Files:", deletedFiles);
                }

                if (filteredFiles.length === 0 &&
                    deletedFiles.length == 0 &&
                    (
                        status.modified.length == 0 ||
                        !status.modified.some(file => path.basename(changesetFilePath).includes(path.basename(file)))
                    )) {
                    console.log("No relevant modified files found.");

                    if (userChoice === "2") {
                        restoreCommitedChanges();
                    }
                    process.exit(0);
                }

                const allSections = categorizeFiles({ filteredFiles, tempSections, config, folders: config.folders });

                if (deletedFiles.length > 0) {
                    const dropQueries = getDropScripts(deletedFiles, config.folders);
                    changesetContent = generateChangesetContent(allSections, dropQueries);
                } else {
                    changesetContent = generateChangesetContent(allSections);
                }

                fs.writeFileSync(changesetTempFilePath, changesetContent.trim(), "utf-8");

                console.log(`Changeset written to ${changesetFilePath}`);

                const content = processChangeset({ config, tempFileName }) + `
    go
    ${getAppVersion(config)}
    go
                `;

                fs.writeFileSync(tempScriptFilePath, content, "utf-8");

                if (config.debugMode) {
                    console.log(`Script written to: ${tempScriptFilePath}`);
                }

                error = await backupAndRun({
                    tempScript: tempScriptFilePath,
                    temptxtfile: changesetTempFilePath,
                    scriptFile: scriptFilePath,
                    txtFile: changesetFilePath,
                    config,
                    userChoice
                });

            } else {
                throw new Error("Error: file not found!");
            }
        } catch (ex) {
            error = ex;

            if (config.debugMode) {
                throw new Error(error);
            } else {
                throw new Error(error.message);
            }
        }

        if (error && userChoice === "2") {
            restoreCommitedChanges();
        }
    }
}

export default createChangeset;