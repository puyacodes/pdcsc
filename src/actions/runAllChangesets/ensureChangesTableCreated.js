import { Exception } from "@locustjs/exception";
import chalk from "chalk";

async function ensureChangesTableCreated(config) {
    let error;

    const { db, changesetsTableName } = config;

    if (config.forceChangesetsTable) {
        console.log(`Ensuring journal table ${chalk.yellow(changesetsTableName)} existence ...`);
    
    
        const query = `IF OBJECT_ID('${changesetsTableName}', 'U') IS NULL
                        CREATE TABLE ${changesetsTableName}
                        (
                            [Id] INT IDENTITY(1,1) PRIMARY KEY,
                            [Name] NVARCHAR(255) NOT NULL,
                            [Date] DATETIME NOT NULL DEFAULT(GETDATE())
                        );`
        config.debug4(query);
    
        await db.executeQuery({ query });
    } else {
        console.log(`Checking journal table ${chalk.yellow(changesetsTableName)} existence ...`);

        const query = `
IF OBJECT_ID('${changesetsTableName}', 'U') IS NULL
    SELECT 0 AS Result
ELSE
    SELECT 1 AS Result`;

        config.debug4(query);
    
        const rs = await db.executeQuery({ query });

        const result = rs && rs.length && rs[0] ? rs[0].Result : false;

        if (!result) {
            error = new Exception(`Journal table ${changesetsTableName} not found. Use -f or --force to create journal table.`)
        } else {
            console.log("journal table exists");
        }
    }

    return error;
}

export default ensureChangesTableCreated;