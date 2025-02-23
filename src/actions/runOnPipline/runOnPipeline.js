import fs from "fs";

async function runOnPipeline(config, scriptFilePath) {
    const { db } = config;
    const { database } = config.database;
    const tempScriptContent = fs.readFileSync(scriptFilePath, "utf-8");

    const error = await backupAndRunScript(config, tempScriptContent);

    if (!error) {
        // Step 4: Execute script on Master DB
        console.log(`Executing script on ${database} database...`);

        await db.executeBatch({ content: tempScriptContent });

        console.log(`Script executed successfully on database: ${database}`);
    }

    return error;
}


export default runOnPipeline;