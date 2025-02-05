const fs = require("fs");
const path = require("path");
const { executeBatch } = require("./executeBatch.js");
const { executeQuery } = require("./executeQuery.js");
const { ExecuteQueryException } = require("../utils/ExecuteQueryException.js");
const { generateRestoreCommand } = require("../startup/generateRestoreCommand.js");
const simpleGit = require("simple-git");
const { execSync } = require("child_process");
const { fileNameWithoutExtension } = require("../utils/fileNameWithoutExtentions.js");
const { extractDateFromString } = require("../utils/extractDateFromString.js");
const { restoreCommitedChanges } = require("../utils/restoreCommitedChanges.js");

async function backupAndRunScript(props) {
    const databaseName = props.config.database.databaseName
    let afterCommit = false;
    let error;
    try {
        if (!props.runAllChangesets) {
            const restoreCommand = await generateRestoreCommand({
                config: props.config,
                backupFile: props.backupFile,
                backupDbName: props.backupDbName
            });

            // Step 1: Create database
            console.log("Creating database backup...");
            await executeQuery({
                query: `BACKUP DATABASE[${databaseName}]TO DISK = '${props.backupFile}' WITH INIT`,
                config: props.config
            });
            if (props.config.options.debugMode) {
                console.log(`Database backup created at: ${props.backupFile}`);
            }

            // Step 2: Restore database
            console.log("Restoring backup to temporary database...");
            await executeQuery({ query: restoreCommand, config: props.config });
            if (props.config.options.debugMode) {
                console.log(`Backup restored as: ${props.backupDbName}`);
            }

            // Step 3: Execute script on backup database
            console.log("Executing script on temporary database...");
            const tempScriptContent = fs.readFileSync(props.tempScript, "utf-8");
            await executeBatch({ content: tempScriptContent, dbName: null, config: props.config });
            if (props.config.options.debugMode) {
                console.log(`Script executed successfully on database: ${props.backupDbName}`);
            } else {
                console.log(`Script executed successfully on temp database.`);
            }
        }

        if (props.runOnPipline || props.runAllChangesets) {
            // Step 4: Execute script on Master DB
            console.log(`Executing script on ${databaseName} database...`);
            const tempScriptContent = fs.readFileSync(props.tempScript, "utf-8");
            await executeBatch({ content: tempScriptContent, dbName: databaseName, config: props.config });
            console.log(`Script executed successfully on database: ${databaseName}`);

            // Added changeset informations to table
            if (props.runAllChangesets) {
                if (props.changesetsTableName) {
                    await updateChangesetsTable(props.changesetsTableName, props.config, props.pendingChangesets, props.now);
                }
            }
        }

        // Step 5: Save script 
        if (!props.runOnPipline && !props.runAllChangesets) {
            fs.renameSync(props.tempScript, props.scriptFile);
            fs.renameSync(props.temptxtfile, props.txtFile);
            console.log(`Script saved at: ${props.scriptFile}`);
        }

        // Step 6: Remove database and tempfile
        if (!props.runAllChangesets) {
            await dropTempDb(props.backupDbName, props.config);
        }

        if (!props.runOnPipline && !props.runAllChangesets) {
            // Step 7: Commit changeset files
            await commitChanges([props.txtFile, props.scriptFile]);
            afterCommit = true;
        }

    } catch (ex) {
        error = ex;
        console.error("Error during script execution:", error.message);
        const logFile = path.join(props.changesetPath, "error.log");

        try {
            fs.writeFileSync(logFile, "", "utf-8");
            try {
                fs.appendFileSync(logFile, JSON.stringify(error, null, 4) + "\n\n", "utf-8");

                if (error instanceof ExecuteQueryException) {
                    fs.appendFileSync(logFile, error.query + "\n\n", "utf-8");
                    error.query = null;
                }
            } catch (ex) {
                fs.appendFileSync(logFile, ex.message + "\n\n", "utf-8");
                fs.appendFileSync(logFile, error.message, "utf-8");
            }
            console.error(`Error log written to: ${logFile}`);
        } catch (error) {
            console.error(`Error creating log file: ${logFile}`);
        }

        await executeQuery({
            query: `IF EXISTS(SELECT name FROM sys.databases WHERE name = '${props.backupDbName}') DROP DATABASE[${props.backupDbName}]`,
            config: props.config
        });

    } finally {
        // Remove temp script file
        if (!props.runOnPipline && !props.runAllChangesets) {
            if (fs.existsSync(props.tempScript)) fs.unlinkSync(props.tempScript);
            if (fs.existsSync(props.temptxtfile)) fs.unlinkSync(props.temptxtfile);
            if (fs.existsSync(props.backupFile)) fs.unlinkSync(props.backupFile);
        }

        if (props.runAllChangesets) {
            if (fs.existsSync(props.tempScript)) fs.unlinkSync(props.tempScript)
        }
    }

    if (error) {
        if (props.userChoice === "2" || afterCommit) {
            restoreCommitedChanges();
        } else if (props.userChoice === "2" && afterCommit) {
            restoreCommitedChanges(2);
        }
        throw new Error(error);
    }
}


/* FUNCTIONS */
async function commitChanges(files) {
    const git = simpleGit();
    try {
        for (let file of files) {
            await git.add(file);
        }
        await git.commit("Auto-Commit after generating changeset.");
    } catch (error) {
        throw new Error(`Error during commiting changes: ${error}`);
    }
}
async function dropTempDb(backupDbName, config) {
    await executeQuery({ query: `DROP DATABASE[${backupDbName}]`, config });
    if (config.options.debugMode) {
        console.log(`Temporary database ${backupDbName} dropped successfully.`);
    } else {
        console.log(`Temporary database dropped successfully.`);
    }
}
async function updateChangesetsTable(changesetsTableName, config, pendingChangesets, now) {
    await executeQuery({
        query: `IF OBJECTID('${changesetsTableName}', 'U') IS NULL CREATE TABLE ${changesetsTableName} (ID INT IDENTITY(1,1) PRIMARY KEY, [NAME] NVARCHAR(255) NOT NULL, [DATE] DATETIME NOT NULL);`,
        config: config
    });
    for (const changeset of pendingChangesets) {
        try {
            const query = `INSERT INTO ${changesetsTableName} ([name], [date]) VALUES ('${fileNameWithoutExtension(changeset.file)}', '${extractDateFromString(config, now)}')`;

            await executeQuery({
                query: query,
                config: config
            });
            console.log(`Inserted changeset: ${changeset.file}`);
        } catch (error) {
            throw new Error(`Error inserting changeset ${changeset.file}: ${error}`);
        }
    }
    console.log(`Changeset added successfully to ${changesetsTableName} table.`);
}


module.exports = { backupAndRunScript };