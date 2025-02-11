const sql = require("mssql");
const { ExecuteQueryException } = require("../utils/ExecuteQueryException.js");

async function executeQuery({ query, dbName, noCatch = true, config }) {
    let error;
    let result;
    try {
        const pool = await sql.connect({
            user: config.database.user,
            password: config.database.password,
            server: config.database.server,
            database: dbName ?? config.database.databaseName,
            options: { encrypt: false }
        });
        result = await pool.request().query(query);
        await pool.close();

        result = result.recordset;

    } catch (ex) {
        if (noCatch) {
            error = ex;
        } else {
            console.log("Error fetching database file Groups:", error);

            result = false;
        }

    }

    if (error) {
        throw new ExecuteQueryException(query, error);
    }

    return result;
}

module.exports = { executeQuery }