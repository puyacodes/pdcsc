import sql from "mssql";
import DbHelperBase from './DbHelperBase'
import { ExecuteQueryException } from "./exceptions";
import { Exception } from "@locustjs/exception";
import chalk from "chalk";
import { isBool, isSomeString } from "@locustjs/base";

class DbHelperSqlServer extends DbHelperBase {
    constructor(config) {
        super(config)
    }
    getConnectionConfig(dbName) {
        return {
            user: this.config.user,
            password: this.config.password,
            server: this.config.server,
            database: dbName ?? this.config.database,
            options: { encrypt: isBool(this.config.encrypt) ? this.config.encrypt : false }
        }
    }
    async executeNonQuery({ query, dbName, options }) {
        let pool;
        let conn_ok = false;
        let error;

        query = query.replace(/^go\s+/i, '');

        if (options && options.minify) {
            query = this.cleanQuery(query);
        }

        try {
            try {
                pool = await sql.connect(this.getConnectionConfig(dbName));

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
    async executeQuery({ query, dbName, options, noCatch = true }) {
        let result;
        let pool;
        let error;
        let conn_ok = false;

        query = query.replace(/^go\s+/i, '');

        if (options && options.minify) {
            query = this.cleanQuery(query);
        }

        try {
            try {
                pool = await sql.connect(this.getConnectionConfig(dbName));

                conn_ok = true;
            } catch (e) {
                console.log("DbHelperSqlServer", e);
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
                    console.error("DbHelperSqlServer", e);
                }
            }
        }

        if (error) {
            throw error;
        }

        return result;
    }
    async executeBatch({ content, dbName, options }) {
        const parts = content.split(/\s+GO\s+/i);

        for (let part of parts) {
            // TODO:
            // add line number to potential errors
            part = part.trim();

            if (part.length) {
                await this.executeQuery({ query: part, dbName, options });
            }
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