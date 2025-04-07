import chalk from "chalk";
import generateRestoreCommand from "./generateRestoreCommand.js";

async function restoreTempDatabase(config) {
    const { db, backupDbName } = config;

    config.debug("Restoring backup to temporary database...");

    const restoreCommand = await generateRestoreCommand(config);

    config.debug2(restoreCommand);

    await db.executeQuery({ query: restoreCommand });

    config.debug(`Backup restored: ${chalk.cyan(backupDbName)}`);
}

export default restoreTempDatabase;