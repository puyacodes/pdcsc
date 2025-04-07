async function executeScript(config, script) {
    const { db, backupDbName } = config;

    config.debug("Executing script on temporary database ...");

    await db.executeBatch({ content: script, dbName: backupDbName });

    config.debug(`Script executed successfully.`);
}

export default executeScript;