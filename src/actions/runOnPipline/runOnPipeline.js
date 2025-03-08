import fs from "fs";
import testScript from "../testScript";

async function runOnPipeline(config, changesetPath) {
    const { db } = config;
    const { database } = config.database;

    const content = fs.readFileSync(changesetPath, "utf-8");

    const error = await testScript(config, content);

    if (!error) {
        // Step 4: Execute script on Master DB
        console.log(`Executing changeset on ${database} database...`);

        await db.executeBatch({ content });

        console.log(`Script executed successfully on database: ${database}`);
    }

    return error;
}


export default runOnPipeline;