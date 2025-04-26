'use strict';

var sql = require('mssql');
var exception = require('@locustjs/exception');
var base = require('@locustjs/base');

class DbHelperBase {
    constructor(config) {
        exception.throwIfInstantiateAbstract(DbHelperBase, this);

        this.config = Object.assign({}, config);
    }
    executeQuery({ query, dbName, noCatch = true }) {
        exception.throwNotImplementedException(`${this.constructor.name}.executeQuery`, this);
    }
    async executeBatch({ content }) {
        exception.throwNotImplementedException(`${this.constructor.name}.executeBatch`, this);
    }
    async dbExists(dbName) {
        exception.throwNotImplementedException(`${this.constructor.name}.dbExists`, this);
    }
}

class ExecuteQueryException extends exception.Exception {
    constructor(query, ...args) {
        super(...args);

        this.query = query;
    }
}

class ConnectionException extends exception.Exception {
}

class DbHelperSqlServer extends DbHelperBase {
    constructor(config) {
        super(config);
    }
    getConnectionConfig(dbName) {
        return {
            user: this.config.user,
            password: this.config.password,
            server: this.config.server,
            database: base.isNullOrEmpty(dbName) ? this.config.database : dbName,
            options: { encrypt: base.isBool(this.config.encrypt) ? this.config.encrypt : false }
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
                error = new ConnectionException(`Database connection error`, e);
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
                error = new ConnectionException(`Database connection error`, e);
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
        await this.executeNonQuery({ query: 'use ' + dbName, dbName: "master" });
    }
}

const config = {
    server: "192.168.10.119",
    user: "sa",
    password: "Rotart314",
    database: "PuyaDbMain",
    encrypt: false
};

async function start() {
    const db = new DbHelperSqlServer(config);

    try {
        await db.dbExists(config.database);

        console.log(`database exists`);
    } catch (ex) {
        console.log(ex.toString());
    }
}

start().catch(console.log);
