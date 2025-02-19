import sql from "mssql";
import DbHelperBase from './DbHelperBase'
import { ExecuteQueryException } from "./exceptions";

class DbHelperSqlServer extends DbHelperBase {
    async executeQuery({ query, dbName, noCatch = true }) {
        let error;
        let result;

        try {
            const pool = await sql.connect({
                user: this.config.database.user,
                password: this.config.database.password,
                server: this.config.database.server,
                database: dbName ?? this.config.database.databaseName,
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
    async executeBatch({ content, dbName }) {
        // try {
        var parts = content.split(/\s+GO\s+/i);
        var i = 0;

        for (let part of parts) {

            await this.executeQuery({ query: part, dbName });

            i++;
        }
        // } catch (error) {

        // }
    }
}

export default DbHelperSqlServer;