import sql from "mssql";
import DbHelperBase from './DbHelperBase'
import { ExecuteQueryException } from "./exceptions";
import { isBool, isNullOrEmpty, isNumber } from "@locustjs/base";
import ConnectionException from "./exceptions/ConnectionException";

class DbHelperSqlServer extends DbHelperBase {
    constructor(config) {
        super(config)
    }
    getConnectionConfig(dbName) {
        const trustServerCertificate = isBool(this.config.database.trustServerCertificate) ? {
            trustServerCertificate: this.config.database.trustServerCertificate
        } : {};
        const connectionTimeout = isNumber(this.config.database.connectionTimeout) && this.config.database.connectionTimeout > 0 ? {
            connectionTimeout: this.config.database.connectionTimeout
        } : { connectionTimeout: 10000 };  // 10 sec
        const requestTimeout = isNumber(this.config.database.requestTimeout) && this.config.database.queryTimeout > 0 ? {
            requestTimeout: this.config.database.queryTimeout
        } : { requestTimeout: 30000 };  // 30 sec

        return {
            user: this.config.user,
            password: this.config.password,
            server: this.config.server,
            database: isNullOrEmpty(dbName) ? this.config.database : dbName,
            options: { encrypt: isBool(this.config.encrypt) ? this.config.encrypt : false, ...trustServerCertificate },
            ...connectionTimeout,
            ...requestTimeout
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
                error = new ConnectionException(`Database connection error`, e)
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
                error = new ConnectionException(`Database connection error`, e)
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
        // this is to check whether connection is ok
        await this.executeNonQuery({ query: 'declare @a int', dbName: "master" });
        // checking given database existence
        await this.executeNonQuery({ query: 'use [' + dbName + ']', dbName: "master" });
    }
}

export default DbHelperSqlServer;