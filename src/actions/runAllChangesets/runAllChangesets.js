import fs from "fs";
import path from "path";
import updateChangesetsTable from "./updateChangesetsTable";
import { ExecuteQueryException } from "../../services/DbHelper/exceptions";
import FileHelper from "../../services/FileHelper";

async function runAllChangesets(result, config) {
    const { db, backupDbName } = config;
    const { database } = config.database;
    let error;

    try {
        // Step 4: Execute script on Master DB
        console.log(`Executing script on ${database} database...`);

        const tempScriptContent = fs.readFileSync(result.allChangesetsScriptFilePath, "utf-8");

        await db.executeBatch({ content: tempScriptContent });

        console.log(`Script executed successfully on database: ${database}`);

        // Added changeset informations to table
        await updateChangesetsTable(config, result.pendingChangesets);
    } catch (ex) {
        error = ex;
        console.error("Error during updating database with all scripts:", error);

        const logFile = path.join(config.paths.changesetsPath, "error.log");

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

        await db.executeQuery({
            query: `IF EXISTS(SELECT name FROM sys.databases WHERE name = '${backupDbName}') DROP DATABASE[${backupDbName}]`,
        });

    } finally {
        FileHelper.deleteFile(result.allChangesetsScriptFilePath);
    }

    return error;
}

export default runAllChangesets;