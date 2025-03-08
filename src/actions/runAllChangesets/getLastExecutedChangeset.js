async function getLastExecutedChangeset(config) {
    const { db, changesetsTableName } = config;

    let result;

    try {
        const rs = await db.executeQuery({
            query: `SELECT TOP 1 [date], [name] FROM ${changesetsTableName} ORDER BY [date] DESC`
        });

        result = rs.length > 0 ? rs[0] : null;
    } catch (ex) {
        if (ex.message.includes("Invalid object name")) {
            throw new Error(`${changesetsTableName} table not found.`, ex);
        } else {
            throw new Error(`cannot fetch last executed changeset from ${changesetsTableName}`, ex);
        }
    }

    return result;
}

export default getLastExecutedChangeset;