import sql from "mssql";
import DbHelperBase from './DbHelperBase'
import { ExecuteQueryException } from "./exceptions";
import { Exception } from "@locustjs/exception";

class DbHelperSqlServer extends DbHelperBase {
    async executeNonQuery({ query, dbName }) {
        try {
            const pool = await sql.connect({
                user: this.config.database.user,
                password: this.config.database.password,
                server: this.config.database.server,
                database: dbName ?? this.config.database.database,
                options: { encrypt: false }
            });

            result = await pool.request().query(query);

            await pool.close();
        } catch (ex) {
            throw new ExecuteQueryException(query, ex);
        }
    }
    async executeQuery({ query, dbName, noCatch = true }) {
        let result;

        try {
            const pool = await sql.connect({
                user: this.config.database.user,
                password: this.config.database.password,
                server: this.config.database.server,
                database: dbName ?? this.config.database.database,
                options: { encrypt: false }
            });

            result = await pool.request().query(query);

            await pool.close();

            result = result.recordset;
        } catch (ex) {
            throw new ExecuteQueryException(query, ex);
        }

        return result;
    }
    async executeBatch({ content, dbName }) {
        const parts = content.split(/\s+GO\s+/i);

        for (let part of parts) {
            await this.executeQuery({ query: part, dbName });
        }
    }
    async dbExists(dbName) {
        try {
            await this.executeNonQuery({ query: 'declare @a int', dbName: "Master" });
        } catch (ex) {
            throw new Exception(`error connecting to database server`, ex);
        }

        try {
            await this.executeNonQuery({ query: 'use ' + dbName, dbName: "Master" });
        } catch (ex) {
            throw new Exception(`database ${dbName} does not exist`, ex);
        }
    }
}

export default DbHelperSqlServer;