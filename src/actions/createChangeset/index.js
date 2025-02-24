import processChangeset from "./ProcessChangeset.js";
import testChangeset from "./testChangeset";
import validateChangedFiles from "./validateChangedFiles.js";
import validateChangeSetFile from "./validateChangeSetFile.js";
import isValidScriptFile from "./isValidScriptFile.js";
import categorizeFiles from "./categorizeFiles.js";
import generateChangesetContent from "./generateChangesetContent.js";
import getAppVersion from "./getAppVersion.js";
import getDropScripts from "./getDropScripts.js";
import getUserChoice from "./getUserChoice.js";
import generateFile from "./generateFile.js";
import getChangedFiles from "./getChangedFiles.js";
import restoreCommitedChanges from "../../utils/restoreCommitedChanges.js";
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
    if (await compareWithDevBranch(config)) {
        let error;
        const { changesetsPath } = config.paths;

        try {
            const status = await git.status();
            userChoice = await getUserChoice(status, config.folders, config);

            if (userChoice === undefined) {
                process.exit(1);
            }
            if (!config.changesetFile) {
                config.changesetFile = await generateFile(config);
            }
            const cleanFilename = path.parse(config.changesetFile).name;
            const tempFileName = `${path.parse(config.changesetFile).name}~`;
            const changesetTempFile = `${path.parse(config.changesetFile).name}~.txt`;
            const changesetFilePath = path.join(changesetsPath, `${cleanFilename}.txt`);
            const changesetTempFilePath = path.join(changesetsPath, changesetTempFile);
            const tempScriptFilePath = path.join(changesetsPath, `${cleanFilename}~.sql`);
            const scriptFilePath = path.join(changesetsPath, `${cleanFilename}.sql`);

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

                const changedFiles = getChangedFiles({ status, debug: config.debugMode, currentBranch: config.currentBranch });
                const filteredFiles = changedFiles.filter((file) => isValidScriptFile({ config, file }));

                config.debug("Filtered Changed Files:", filteredFiles);
                config.debug("Filtered Deleted Files:", deletedFiles);
                
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

                config.debug(`Script written to: ${tempScriptFilePath}`);
                
                error = await testChangeset({
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