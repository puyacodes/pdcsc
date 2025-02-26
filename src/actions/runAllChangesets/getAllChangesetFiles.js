import fs from "fs";
import path from "path";
import sql from "mssql";
import extractDateFromString from "../../utils/extractDateFromString";
import { Exception } from "@locustjs/exception";

async function getAllChangesetFiles(config) {
    try {
        const allChangesetsScriptFilePath = path.join(config.paths.changesetsPath, `${config.now}-update-${config.database.database}.sql`);

        const result = await getChangesetTable(config);
        const pendingChangesets = getPendingChangesets(config, result);
        const combinedContent = generateCombinedContent(pendingChangesets);

        fs.writeFileSync(allChangesetsScriptFilePath, combinedContent, "utf-8");

        console.log("Pending changesets combined successfully!");

        return { allChangesetsScriptFilePath, pendingChangesets };
    } catch (ex) {
        throw new Exception('error getting changesets and combining them', ex)
    }
}

/* FUNCTIONS */
async function getChangesetTable(config) {
    let error;
    const { db, changesetsTableName } = config;

    await db.executeQuery({
        query: `IF OBJECT_ID('${changesetsTableName}', 'U') IS NULL CREATE TABLE ${changesetsTableName} (ID INT IDENTITY(1,1) PRIMARY KEY, [NAME] NVARCHAR(255) NOT NULL, [DATE] DATETIME NOT NULL);`
    });

    const pool = await sql.connect({
        ...config.database,
        options: { encrypt: false }
    });

    let result;
    
    try {
        result = await pool.request().query(`
                SELECT TOP 1 [date], [name]
                FROM ${changesetsTableName} 
                ORDER BY [date] DESC
                `);

    } catch (ex) {
        error = ex;

        if (ex.message.includes("Invalid object name")) {
            throw new Error(`${changesetsTableName} table not found.`);
        }
        else {
            throw new Error(`Error during select last executed changeset from ${changesetsTableName}: ${ex.message}`);
        }
    } finally {
        sql.close();
    }
    
    return result;
}

function getPendingChangesets(config, result) {
    const files = fs.readdirSync(config.paths.changesetsPath);
    const sqlFiles = files.filter(file => path.extname(file) === ".sql");
    let lastExecutedChangesetName = result.recordset.length > 0 ? result.recordset[0].name : null;
    let lastExecutedDate = result.recordset.length > 0 ? extractDateFromString(config, lastExecutedChangesetName) : null;
    let pendingChangesets = [];

    for (const file of sqlFiles) {
        const filePath = path.join(config.paths.changesetsPath, file);
        const match = file.match(/(\d{12,14})/);

        if (!match) {
            config.warn(`Skipping file with invalid format: ${file}`);
            
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

    config.debug("pendingChangesetsArray:", pendingChangesets.map(changeset => changeset.file));
    
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


export default getAllChangesetFiles;