import { Exception } from "@locustjs/exception";

async function getFileGroups(config) {
    try {
        const query = `
            SELECT
                db.name AS dbName,
                type_desc AS fileType,
                Physical_Name AS location,
                mf.Name AS name
            FROM
                sys.master_files mf
            INNER JOIN 
                sys.databases db ON db.database_id = mf.database_id
            WHERE db.name = '${config.database.database}'
        `;
        const result = await config.db.executeQuery({ query });

        return result;
    } catch (ex) {
        throw new Exception(`Error fetching database FileGroups`, ex);
    }
}

export default getFileGroups;