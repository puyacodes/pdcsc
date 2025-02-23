import getFileGroups from "./getFileGroups";

async function generateRestoreCommand(config) {
    const { backupDbName } = config;

    try {
        const fileLocations = await getFileGroups(config);
        const moveClauses = fileLocations.map(file => {
            const newFileName = `${config.paths.backupDir}${backupDbName}_${file.Location.split("\\").pop()}`;
            return `MOVE '${file.Name}' TO '${newFileName}'`;
        });

        const moveString = moveClauses.join(", ");

        const restoreCommand = `
use master;

RESTORE DATABASE [${backupDbName}] FROM DISK='${config.paths.backupFile}' WITH File = 1, ${moveString};`;

        return restoreCommand;
    } catch (error) {
        throw new Error(`Error generating restore command: ${error}`);
    }
}

export default generateRestoreCommand;