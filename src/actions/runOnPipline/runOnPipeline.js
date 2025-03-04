import fs from "fs";
import testScript from "../testScript";

async function runOnPipeline(config, scriptFilePath) {
    const { db } = config;
    const { database } = config.database;

    //TODO - Run all changesets on a temprorary database
    const tempScriptContent = fs.readFileSync(scriptFilePath, "utf-8");

    const error = await testScript(config, tempScriptContent);

    if (!error) {
        // Step 4: Execute script on Master DB
        console.log(`Executing script on ${database} database...`);

        await db.executeBatch({ content: tempScriptContent });

        console.log(`Script executed successfully on database: ${database}`);
    }

    return error;
}


export default runOnPipeline;