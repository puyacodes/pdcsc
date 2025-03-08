async function ensureChangesTableCreated(config) {
    const { db, changesetsTableName } = config;

    await db.executeQuery({
        query: `IF OBJECT_ID('${changesetsTableName}', 'U') IS NULL
                    CREATE TABLE ${changesetsTableName}
                    (
                        [Id] INT IDENTITY(1,1) PRIMARY KEY,
                        [Name] NVARCHAR(255) NOT NULL,
                        [Date] DATETIME NOT NULL DEFAULT(GETDATE())
                    );`
    });
}

export default ensureChangesTableCreated;