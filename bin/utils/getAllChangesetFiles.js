const fs = require("fs");
const path = require("path");
const sql = require("mssql");
const { executeQuery } = require("../executions/executeQuery");
const { extractDateFromString } = require("../utils/extractDateFromString");

async function getAllChangesetFiles(config, now) {
    try {
        const changesetsPath = path.join(config.basePath, config.paths.changesetFolderName);
        const allChangesetsScriptFilePath = path.join(changesetsPath, `${now}-update-${config.database.databaseName}.sql`);

        const result = await getChangesetTable(config);
        const pendingChangesets = getPendingChangesets(config, changesetsPath, result);
        const combinedContent = generateCombinedContent(pendingChangesets);

        fs.writeFileSync(allChangesetsScriptFilePath, combinedContent, "utf-8");
        console.log("Pending changesets combined successfully!");

        return { allChangesetsScriptFilePath, pendingChangesets };

    } catch (error) {
        if (error.message.includes("No new changesets found.")) {
            console.log(error.message);
            process.exit(0);
        } else {
            console.error('Error combining files:', error);
        }
    }
}

/* FUNCTIONS */
async function getChangesetTable(config) {
    await executeQuery({
        query: `IF OBJECT_ID('${config.paths.changesetsTableName}', 'U') IS NULL CREATE TABLE ${config.paths.changesetsTableName} (ID INT IDENTITY(1,1) PRIMARY KEY, [NAME] NVARCHAR(255) NOT NULL, [DATE] DATETIME NOT NULL);`,
        config: config
    });

    const pool = await sql.connect({
        user: config.database.user,
        password: config.database.password,
        server: config.database.server,
        database: config.database.databaseName,
        options: { encrypt: false }
    });
    let result;
    try {
        result = await pool.request().query(`
                SELECT TOP 1 [date], [name]
                FROM ${config.paths.changesetsTableName} 
                ORDER BY [date] DESC
                `);

    } catch (error) {
        if (error.message.includes("Invalid object name")) {
            throw new Error(`${config.paths.changesetsTableName} table not found.`);
        }
        else {
            throw new Error(`Error during select last executed changeset from ${config.paths.changesetsTableName}: ${error.message}`);
        }
    } finally {
        sql.close();
    }
    return result;
}

function getPendingChangesets(config, changesetsPath, result) {
    const files = fs.readdirSync(changesetsPath);
    const sqlFiles = files.filter(file => path.extname(file) === ".sql");
    let lastExecutedChangesetName = result.recordset.length > 0 ? result.recordset[0].name : null;
    let lastExecutedDate = result.recordset.length > 0 ? extractDateFromString(config, lastExecutedChangesetName) : null;
    let pendingChangesets = [];

    for (const file of sqlFiles) {
        const filePath = path.join(changesetsPath, file);
        const match = file.match(/(\d{12,14})/);
        if (!match) {
            if (config.options.debugMode) {
                console.warn(`Skipping file with invalid format: ${file}`);
            }
            continue;
        }

        let fileDateStr = match[1]; //exp: 140311131345
        let fileDate = extractDateFromString(config, fileDateStr);

        if (!lastExecutedDate || fileDate > lastExecutedDate && file != lastExecutedChangesetName) {
            if (!file.includes("update")) {
                pendingChangesets.push({ file, fileDate, filePath });
            }
        }
    }

    if (config.options.debugMode) {
        console.log("pendingChangesetsArray:", pendingChangesets.map(changeset => changeset.file));
    }

    if (pendingChangesets.length === 0) {
        throw new Error("No new changesets found.");
    }

    pendingChangesets.sort((a, b) => a.fileDate - b.fileDate);
    return pendingChangesets;
}

function generateCombinedContent(pendingChangesets) {
    let combinedContent = "";
    for (const changeset of pendingChangesets) {
        const fileContent = fs.readFileSync(changeset.filePath, "utf-8");
        combinedContent += `-- Contents of ${changeset.file}\n`;
        combinedContent += fileContent + '\n\n';
    }

    const pendingChangesetsComment = `
/* 
    The update includes these changeset files:
    ${pendingChangesets.map(change => `File: ${change.file}`).join('\n    ')}
*/
`;

    combinedContent += pendingChangesetsComment;

    return combinedContent;
}


module.exports = { getAllChangesetFiles }