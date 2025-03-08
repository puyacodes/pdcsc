import { Exception } from "@locustjs/exception";

async function addChangesetToDatabase(config, changeset) {
    const { db, changesetsTableName } = config;

    try {
        const query = `INSERT INTO ${changesetsTableName} ([name]) VALUES ('${changeset.name}')`;

        await db.executeQuery({ query });

        console.log(`changeset ${changeset.name} added`);
    } catch (ex) {
        throw new Exception(`Error adding changeset ${changeset.name} to database`, ex);
    }
}

export default addChangesetToDatabase;