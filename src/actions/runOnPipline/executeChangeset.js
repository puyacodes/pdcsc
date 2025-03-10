import { Exception } from "@locustjs/exception";

async function executeChangeset(config, changeset) {
    let error;
    const { db } = config;
    const { database } = config.database;

    try {
        console.log(`Executing changeset on ${database} database...`);

        await db.executeBatch({ content: changeset });

        console.log(`Script executed successfully on database: ${database}`);
    } catch (ex) {
        error = new Exception(`executing changeset on ${database} failed`, ex);
    }

    return error;
}

export default executeChangeset