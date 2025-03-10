async function executeScript(config, script) {
    const { db, backupDbName } = config;

    console.log("Executing script on temporary database...");

    await db.executeBatch({ content: script, dbName: backupDbName });

    console.log(`Script executed successfully on temp database.`);
}

export default executeScript;