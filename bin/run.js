const { processChangeset } = require("./executions/ProcessChangeset.js");
const { backupAndRunScript } = require("./executions/backupAndRunScript.js");
const { validateChangedFiles } = require("./validations/validateChangedFiles.js");
const { validateChangeSetFile } = require("./validations/validateChangeSetFile.js");
const { isValidScriptFile } = require("./validations/isValidScriptFile.js");
const { categorizeFiles } = require("./startup/categorizeFiles.js");
const { generateChangesetContent } = require("./startup/generateChangesetContent.js");
const { getAppVersion } = require("./utils/getAppVersion.js");
const { getChangesetFile } = require("./utils/getChangesetFile.js");
const { getDropScripts } = require("./utils/getDropScripts.js");
const { getUserChoice } = require("./startup/getUserChoice.js");
const { generateFile } = require("./startup/generateFile.js");
const { getModifiedAndUntrackedFiles } = require("./utils/getModifiedAndUntrackedFiles.js");
const { restoreCommitedChanges } = require("./utils/restoreCommitedChanges.js");

const simpleGit = require("simple-git");
const git = simpleGit();
const fs = require("fs");
const path = require("path");
const { getAllChangesetFiles } = require("./utils/getAllChangesetFiles.js");

let tempSections = {
    procedures: [],
    functions: [],
    tables: [],
    relations: [],
    types: [],
    views: [],
    indexes: [],
    triggers: [],
    schemas: []
};
let userChoice;
let hasContent;
let changesetContent;
const backupDbName = 'TempBackupDB';

async function run(config, defaults) {
    try {
        if (!config.options.runOnPipline && !config.options.runAllChangesets) {
            const status = await git.status();
            userChoice = await getUserChoice(status, config.folders, config);
            if (userChoice === undefined) {
                process.exit(1);
            }
            if (!config.changesetFile) {
                config.changesetFile = await generateFile(defaults.changesetPath, defaults.now, config);
            }
            const cleanFilename = path.parse(config.changesetFile).name;
            const tempFileName = `${path.parse(config.changesetFile).name}~`;
            const changesetTempFile = `${path.parse(config.changesetFile).name}~.txt`;
            const changesetFilePath = path.join(defaults.changesetPath, `${cleanFilename}.txt`);
            const changesetTempFilePath = path.join(defaults.changesetPath, changesetTempFile);
            const tempScriptFilePath = path.join(defaults.changesetPath, `${cleanFilename}~.sql`);
            const scriptFilePath = path.join(defaults.changesetPath, `${cleanFilename}.sql`);
            if (fs.existsSync(changesetFilePath)) {
                const deletedFiles = [];
                if (status.deleted.length > 0) {
                    validateChangedFiles({
                        status: status.deleted,
                        listName: deletedFiles,
                        commit: false,
                        folder: config.folders,
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

                const modifiedFiles = getModifiedAndUntrackedFiles({ debug: config.options.debugMode, currentBranch: defaults.currentBranch });
                const filteredFiles = modifiedFiles.filter((file) => isValidScriptFile({ config, file }));
                if (config.options.debugMode) {
                    console.log("Filtered Modified Files:", filteredFiles);
                    console.log("Filtered Deleted Files:", deletedFiles);
                }
                if (filteredFiles.length === 0 && deletedFiles.length == 0) {
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
                if (config.options.debugMode) {
                    console.log(`Script written to: ${tempScriptFilePath}`);
                }
                await backupAndRunScript({
                    tempScript: tempScriptFilePath,
                    temptxtfile: changesetTempFilePath,
                    scriptFile: scriptFilePath,
                    txtFile: changesetFilePath,
                    changesetPath: defaults.changesetPath,
                    runOnPipline: config.options.runOnPipline,
                    backupFile: defaults.backupFile,
                    backupDbName,
                    config,
                    userChoice,
                    folders: config.folders
                });

            } else {
                if (userChoice === "2") {
                    restoreCommitedChanges();
                }
                throw new Error("Error: file not found!");
            }
        } else {
            if (config.options.runOnPipline && !config.options.runAllChangesets) {
                const changesetFileName = await getChangesetFile(defaults.masterBranchName, defaults.realBranchName, defaults.currentBranch);
                if (changesetFileName) {
                    const scriptFilePath = path.join(defaults.changesetPath, `${changesetFileName}`);

                    await backupAndRunScript({
                        tempScript: scriptFilePath,
                        temptxtfile: "",
                        scriptFile: "",
                        txtFile: "",
                        changesetPath: defaults.changesetPath,
                        runOnPipline: config.options.runOnPipline,
                        backupFile: defaults.backupFile,
                        backupDbName,
                        config,
                        userChoice,
                        folders: config.folders,
                        changesetsTableName: config.paths.changesetsTableName,
                        now: defaults.now
                    });
                } else {
                    return;
                }
            }

            if (config.options.runAllChangesets) {
                const result = await getAllChangesetFiles(config, defaults.now);
                if (config.options.debugMode) {
                    console.log("allChangesetsScriptFilePath:", result.allChangesetsScriptFilePath)
                }
                if (result?.allChangesetsScriptFilePath) {
                    await backupAndRunScript({
                        tempScript: result.allChangesetsScriptFilePath,
                        temptxtfile: "",
                        scriptFile: "",
                        txtFile: "",
                        changesetPath: defaults.changesetPath,
                        runAllChangesets: config.options.runAllChangesets,
                        backupFile: defaults.backupFile,
                        backupDbName,
                        config,
                        userChoice,
                        folders: config.folders,
                        now: defaults.now,
                        pendingChangesets: result.pendingChangesets,
                        changesetsTableName: config.paths.changesetsTableName,
                    });
                } else {
                    return;
                }
            }
        }
    } catch (error) {
        if (!config.options.runOnPipline && !config.options.runAllChangesets) {
            if (userChoice == "2") {
                restoreCommitedChanges();
            }
        }
        if (config.options.debugMode) {
            throw new Error(error);
        } else {
            throw new Error(error.message);
        }
    }
}

module.exports = { run }