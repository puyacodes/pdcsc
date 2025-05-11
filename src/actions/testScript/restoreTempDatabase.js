import chalk from "chalk";
import generateRestoreCommand from "./generateRestoreCommand.js";

async function restoreTempDatabase(config) {
    const { db, backupDbName } = config;

    config.debug("Restoring backup to temporary database...");

    const query = await generateRestoreCommand(config);

    config.debug4(query);

    await db.executeQuery({ query });

    config.debug(`Backup restored: ${chalk.cyan(backupDbName)}`);
}

export default restoreTempDatabase;