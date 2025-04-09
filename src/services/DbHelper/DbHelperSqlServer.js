import sql from "mssql";
import DbHelperBase from './DbHelperBase'
import { ExecuteQueryException } from "./exceptions";
import { Exception } from "@locustjs/exception";
import chalk from "chalk";

class DbHelperSqlServer extends DbHelperBase {
    constructor(config) {
        super(config)
    }
    async executeNonQuery({ query, dbName }) {
        let pool;
        let conn_ok = false;
        let error;

        try {
            try {
                pool = await sql.connect({
                    user: this.config.user,
                    password: this.config.password,
                    server: this.config.server,
                    database: dbName ?? this.config.database,
                    options: { encrypt: false }
                });

                conn_ok = true;
            } catch (e) {
                console.log(e);
            }

            if (conn_ok) {
                await pool.request().query(query);
            }
        } catch (ex) {
            error = new ExecuteQueryException(query, ex);
        } finally {
            if (pool && conn_ok) {
                try {
                    await pool.close();
                } catch (e) {
                    console.error(e);
                }
            }
        }

        if (error) {
            throw error;
        }
    }
    async executeQuery({ query, dbName, noCatch = true }) {
        let result;
        let pool;
        let error;
        let conn_ok = false;

        try {
            try {
                pool = await sql.connect({
                    user: this.config.user,
                    password: this.config.password,
                    server: this.config.server,
                    database: dbName ?? this.config.database,
                    options: { encrypt: false }
                });

                conn_ok = true;
            } catch (e) {
                console.log(e);
            }

            if (conn_ok) {
                result = await pool.request().query(query);

                result = result.recordset;
            }
        } catch (ex) {
            error = new ExecuteQueryException(query, ex);
        } finally {
            if (pool && conn_ok) {
                try {
                    await pool.close();
                } catch (e) {
                    console.error(e);
                }
            }
        }

        if (error) {
            throw error;
        }

        return result;
    }
    async executeBatch({ content, dbName }) {
        const parts = content.split(/\s+GO\s+/i);

        for (let part of parts) {
            // TODO:
            // add line number to potential errors
            await this.executeQuery({ query: part, dbName });
        }
    }
    async dbExists(dbName) {
        try {
            await this.executeNonQuery({ query: 'declare @a int', dbName: "master" });
        } catch (ex) {
            throw new Exception(`Error connecting to database server`, ex);
        }

        try {
            await this.executeNonQuery({ query: 'use ' + dbName, dbName: "master" });
        } catch (ex) {
            throw new Exception(`Database ${chalk.magenta(dbName)} does not exist`, ex);
        }
    }
}

export default DbHelperSqlServer;