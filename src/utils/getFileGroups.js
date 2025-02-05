const sql = require("mssql");

async function getFileGroups({ config }) {
    try {
        const pool = await sql.connect({
            user: config.database.user,
            password: config.database.password,
            server: config.database.server,
            database: config.database.databaseName,
            options: { encrypt: false }
        });
        const query = `
            SELECT
                db.name AS DBName,
                type_desc AS FileType,
                Physical_Name AS Location,
                mf.Name AS Name
            FROM
                sys.master_files mf
            INNER JOIN 
                sys.databases db ON db.database_id = mf.database_id
            WHERE db.name = '${config.database.databaseName}'
        `;
        const result = await pool.request().query(query);
        await pool.close();

        return result.recordset;

    } catch (error) {
        throw new Error(`Error fetching database file Groups: ${error}`);
    }
}

module.exports = { getFileGroups }