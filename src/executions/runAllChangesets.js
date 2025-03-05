const fs = require("fs");
const path = require("path");
let moment = require("jalali-moment");
const { executeBatch } = require("./executeBatch.js");
const { executeQuery } = require("./executeQuery.js");
const { ExecuteQueryException } = require("../exceptions/ExecuteQueryException.js");
const { fileNameWithoutExtension } = require("../utils/fileNameWithoutExtentions.js");
const { extractDateFromString } = require("../utils/extractDateFromString.js");
const { BackupAndRunException } = require("../exceptions/BackupAndRunException.js");

/*
    test
    test & update
    update
*/
async function runAllChangesets(result, defaults, backupDbName, config) {
    const databaseName = config.database.databaseName;
    const changesetsTableName = config.paths.changesetsTableName;
    let error;
    try {

        // Step 4: Execute script on Master DB
        console.log(`Executing script on ${databaseName} database...`);
        const tempScriptContent = fs.readFileSync(result.allChangesetsScriptFilePath, "utf-8");
        await executeBatch({ content: tempScriptContent, dbName: databaseName, config: config });
        console.log(`Script executed successfully on database: ${databaseName}`);

        // Added changeset informations to table
        if (changesetsTableName) {
            await updateChangesetsTable(changesetsTableName, config, result.pendingChangesets, defaults.now);
        }

    } catch (ex) {
        error = ex;
        console.error("Error during updating database with all scripts:", error.message);
        const logFile = path.join(defaults.changesetPath, "error.log");

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

    } finally {
        if (fs.existsSync(result.allChangesetsScriptFilePath)) fs.unlinkSync(result.allChangesetsScriptFilePath)
    }

    if (error) {
        throw new BackupAndRunException(error);
    }
}


/* FUNCTIONS */

async function updateChangesetsTable(changesetsTableName, config, pendingChangesets, now) {
    const gregorianDateTime = moment(extractDateFromString(config, now), 'jYYYY-jMM-jDD HH:mm:ss')
        .locale('en')
        .format('YYYY-MM-DD HH:mm:ss');
    await executeQuery({
        query: `IF OBJECT_ID('${changesetsTableName}', 'U') IS NULL CREATE TABLE ${changesetsTableName} (ID INT IDENTITY(1,1) PRIMARY KEY, [NAME] NVARCHAR(255) NOT NULL, [DATE] DATETIME NOT NULL);`,
        config: config
    });
    for (const changeset of pendingChangesets) {
        try {
            const query = `INSERT INTO ${changesetsTableName} ([name], [date]) VALUES ('${fileNameWithoutExtension(changeset.file)}', '${gregorianDateTime}')`;

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


module.exports = { runAllChangesets };