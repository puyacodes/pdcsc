import { Exception } from "@locustjs/exception";
import chalk from "chalk";

async function addChangesetToDatabase(config, changeset) {
    const { db, changesetsTableName } = config;

    console.log(`   Adding changeset to database ...`);

    try {
        const query = `INSERT INTO ${changesetsTableName} ([name]) VALUES ('${changeset.name}')`;

        config.debug2(query);

        await db.executeQuery({ query });

        console.log(`Changeset added.`);
    } catch (ex) {
        throw new Exception(`Error adding changeset ${chalk.cyan(changeset.name)} to database`, ex);
    }
}

export default addChangesetToDatabase;