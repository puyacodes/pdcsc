const sql = require("mssql");

async function getFileGroups({ config }) {
    const _config = {
        user: config.database.user,
        password: config.database.password,
        server: config.database.server,
        database: config.database.databaseName,
        options: { encrypt: false }
    }
    try {
        const pool = await sql.connect(_config);
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