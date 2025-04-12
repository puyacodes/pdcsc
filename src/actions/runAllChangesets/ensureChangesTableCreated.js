async function ensureChangesTableCreated(config) {
    config.debug("Ensuring Changesets table existence ...");

    const { db, changesetsTableName } = config;

    const query = `IF OBJECT_ID('${changesetsTableName}', 'U') IS NULL
                    CREATE TABLE ${changesetsTableName}
                    (
                        [Id] INT IDENTITY(1,1) PRIMARY KEY,
                        [Name] NVARCHAR(255) NOT NULL,
                        [Date] DATETIME NOT NULL DEFAULT(GETDATE())
                    );`
    config.debug4(query);

    await db.executeQuery({ query });
}

export default ensureChangesTableCreated;