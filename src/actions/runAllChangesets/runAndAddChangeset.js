import fs from "fs";
import createErrorLog from "../../utils/createErrorLog.js";
import addChangesetToDatabase from "./addChangesetToDatabase.js";

async function runAndAddChangeset(config, changeset) {
    const { db } = config;
    let error;

    try {
        console.log(`   executing changeset ${changeset.name} ...`);
        
        const content = fs.readFileSync(changeset.path, "utf-8");
        
        await db.executeBatch({ content });
        
        console.log(`   succeeded.`);
        console.log(`   adding changeset to database ...`);

        await addChangesetToDatabase(config, changeset);
    } catch (ex) {
        error = ex;

        createErrorLog(config, ex);
    }

    return error;
}

export default runAndAddChangeset;