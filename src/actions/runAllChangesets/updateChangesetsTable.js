import fileNameWithoutExtension from "../../utils/fileNameWithoutExtentions.js";
import extractDateFromString from "../../utils/extractDateFromString.js";
import { Exception } from "@locustjs/exception";
import moment from "jalali-moment";

async function updateChangesetsTable(config, pendingChangesets) {
    const { db, changesetsTableName } = config;

    await db.executeQuery({
        query: `IF OBJECT_ID('${changesetsTableName}', 'U') IS NULL CREATE TABLE ${changesetsTableName} (ID INT IDENTITY(1,1) PRIMARY KEY, [NAME] NVARCHAR(255) NOT NULL, [DATE] DATETIME NOT NULL);`,
    });

    for (const changeset of pendingChangesets) {
        try {
            const gregorianDateTime = moment(extractDateFromString(config, now), 'jYYYY-jMM-jDD HH:mm:ss')
                                    .locale('en')
                                    .format('YYYY-MM-DD HH:mm:ss');

            const query = `INSERT INTO ${changesetsTableName} ([name], [date]) VALUES ('${fileNameWithoutExtension(changeset.file)}', '${extractDateFromString(config, gregorianDateTime)}')`;

            await db.executeQuery({ query });

            console.log(`Inserted changeset: ${changeset.file}`);
        } catch (ex) {
            throw new Exception(`Error inserting changeset ${changeset.file}`, ex);
        }
    }

    console.log(`Changeset added successfully to ${changesetsTableName} table.`);
}

export default updateChangesetsTable;