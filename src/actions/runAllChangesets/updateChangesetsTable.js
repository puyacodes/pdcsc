import fileNameWithoutExtension from "../../utils/fileNameWithoutExtentions.js";
import extractDateFromString from "../../utils/extractDateFromString.js";

async function updateChangesetsTable(config, pendingChangesets) {
    const { db, changesetsTableName } = config;

    await db.executeQuery({
        query: `IF OBJECT_ID('${changesetsTableName}', 'U') IS NULL CREATE TABLE ${changesetsTableName} (ID INT IDENTITY(1,1) PRIMARY KEY, [NAME] NVARCHAR(255) NOT NULL, [DATE] DATETIME NOT NULL);`,
    });

    for (const changeset of pendingChangesets) {
        try {
            const query = `INSERT INTO ${changesetsTableName} ([name], [date]) VALUES ('${fileNameWithoutExtension(changeset.file)}', '${extractDateFromString(config, config.now)}')`;

            await db.executeQuery({ query });

            console.log(`Inserted changeset: ${changeset.file}`);
        } catch (error) {
            throw new Error(`Error inserting changeset ${changeset.file}: ${error}`);
        }
    }

    console.log(`Changeset added successfully to ${changesetsTableName} table.`);
}

export default updateChangesetsTable;