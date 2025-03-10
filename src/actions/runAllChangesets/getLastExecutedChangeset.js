import { Exception } from "@locustjs/exception";

async function getLastExecutedChangeset(config) {
    const { db, changesetsTableName } = config;

    let result;

    try {
        const rs = await db.executeQuery({
            query: `SELECT TOP 1 [date], [name] FROM ${changesetsTableName} ORDER BY [date] DESC`
        });

        result = rs && rs.length ? rs[0] : null;
    } catch (ex) {
        throw new Exception(`cannot fetch last executed changeset`, ex);
    }

    return result;
}

export default getLastExecutedChangeset;