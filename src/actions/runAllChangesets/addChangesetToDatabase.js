import { isNullOrEmpty } from "@locustjs/base";
import { Exception } from "@locustjs/exception";

async function addChangesetToDatabase(config, changeset, i) {
    let error;
    const { db, changesetsTableName } = config;

    console.log(`  Journaling changeset ...`);

    try {
        const query = `INSERT INTO ${changesetsTableName} ([name]) VALUES ('${changeset.name}')`;

        config.debug4(query);

        await db.executeQuery({ query });
    } catch (ex) {
        error = new Exception(`Journaling changeset${isNullOrEmpty(i) ? "": ` #${i}`} ${changeset.name} to database ${config.database.database} failed.`, ex);
    }

    return error;
}

export default addChangesetToDatabase;