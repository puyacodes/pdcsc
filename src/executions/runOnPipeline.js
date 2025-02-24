const fs = require("fs");
const path = require("path");
const { executeBatch } = require("./executeBatch.js");
const { executeQuery } = require("./executeQuery.js");
const { ExecuteQueryException } = require("../exceptions/ExecuteQueryException.js");
const { generateRestoreCommand } = require("../startup/generateRestoreCommand.js");
const { BackupAndRunException } = require("../exceptions/BackupAndRunException.js");

async function runOnPipeline(config, defaults, scriptFilePath, backupDbName) {
    const databaseName = config.database.databaseName;
    const tempScriptContent = fs.readFileSync(scriptFilePath, "utf-8");
    let error;
    try {
        const restoreCommand = await generateRestoreCommand({
            config: config,
            backupFile: defaults.backupFile,
            backupDbName: backupDbName
        });

        // Step 1: Create database
        console.log("Creating database backup...");
        await executeQuery({
            query: `BACKUP DATABASE[${databaseName}]TO DISK = '${defaults.backupFile}' WITH INIT`,
            config: config
        });
        if (config.options.debugMode) {
            console.log(`Database backup created at: ${defaults.backupFile}`);
        }

        // Step 2: Restore database
        console.log("Restoring backup to temporary database...");
        await executeQuery({ query: restoreCommand, config: config });
        if (config.options.debugMode) {
            console.log(`Backup restored as: ${backupDbName}`);
        }

        // Step 3: Execute script on backup database
        console.log("Executing script on temporary database...");
        await executeBatch({ content: tempScriptContent, dbName: props.backupDbName, config: config });
        if (config.options.debugMode) {
            console.log(`Script executed successfully on database: ${backupDbName}`);
        } else {
            console.log(`Script executed successfully on temp database.`);
        }

        // Step 4: Execute script on Master DB
        console.log(`Executing script on ${databaseName} database...`);
        await executeBatch({ content: tempScriptContent, dbName: databaseName, config: config });
        console.log(`Script executed successfully on database: ${databaseName}`);

    } catch (ex) {
        error = ex;
        console.error("Error during executing script on pipeline:", error.message);
        const logFile = path.join(changesetPath, "error.log");

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
            query: `IF EXISTS(SELECT name FROM sys.databases WHERE name = '${backupDbName}') DROP DATABASE[${backupDbName}]`,
            config: config
        });

    }

    if (error) {
        throw new BackupAndRunException(error);
    }
}


module.exports = { runOnPipeline };