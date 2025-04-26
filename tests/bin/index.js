'use strict';

var sql = require('mssql');
var exception = require('@locustjs/exception');
var chalk$1 = require('chalk');
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

class DbHelperSqlServer extends DbHelperBase {
    constructor(config) {
        super(config);
    }
    getConnectionConfig(dbName) {
        return {
            user: this.config.user,
            password: this.config.password,
            server: this.config.server,
            database: base.isNullOrEmpty(dbName) ? this.config.database: dbName,
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
            throw new exception.Exception(`Error connecting to database server`, ex);
        }

        try {
            await this.executeNonQuery({ query: 'use ' + dbName, dbName: "master" });
        } catch (ex) {
            throw new exception.Exception(`Database ${chalk$1.magenta(dbName)} does not exist`, ex);
        }
    }
}

async function start() {
    const config = {
        server: "192.168.10.119",
        user: "sa",
        password: "Rotart314$",
        database: "PuyaDbMain"
    };
    const db = new DbHelperSqlServer(config);

    try {
        await db.dbExists(config.database);

        console.log(`database exists`);
    } catch (ex) {
        console.error(chalk.red(`Master database does not exist or cannot check its existence.`));
        console.log(ex);
    }
}

start().catch(console.log);
