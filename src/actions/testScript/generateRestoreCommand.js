import { Exception } from "@locustjs/exception";
import getFileGroups from "./getFileGroups";

async function generateRestoreCommand(config) {
    const { backupDbName } = config;

    try {
        const fileGroups = await getFileGroups(config);
        const moveClauses = fileGroups.map(file => {
            const newFileName = `${config.paths.backupDir}${backupDbName}_${file.location.split("\\").pop()}`;
            
            return `MOVE '${file.name}' TO '${newFileName}'`;
        });

        const moveString = moveClauses.join(", ");

        const restoreCommand = `
use master;

RESTORE DATABASE [${backupDbName}] FROM DISK='${config.paths.backupFile}' WITH File = 1, ${moveString};`;

        return restoreCommand;
    } catch (ex) {
        throw new Exception(`Error generating restore command`, ex);
    }
}

export default generateRestoreCommand;