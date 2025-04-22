import sql from "mssql";
import DbHelperBase from './DbHelperBase'
import { ExecuteQueryException } from "./exceptions";
import { Exception } from "@locustjs/exception";
import chalk from "chalk";
import { isSomeString } from "@locustjs/base";

class DbHelperSqlServer extends DbHelperBase {
    constructor(config) {
        super(config)
    }
    async executeNonQuery({ query, dbName }) {
        let pool;
        let conn_ok = false;
        let error;

        query = query.replace(/^go\s+/i, '');

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

        query = query.replace(/^go\s+/i, '');

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
            part = part.trim();

            if (part.length) {
                await this.executeQuery({ query: part, dbName });
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
    cleanQuery(query) {
        let result = "";

        if (isSomeString(query)) {
            const states = {
                main: 0,
                stringStarted: 1,
                isSingleLineComment: 2,
                singleLineComment: 21,
                isMultiLineComment: 3,
                multiLineComment: 31,
                isMultiLineCommentEnding: 32,
                inWhitespace: 4,
                inNewLine: 5,
                inBracket: 6
            }
            let ch;
            let i = 0;
            let state = states.main;

            while (true) {
                ch = query.substr(i, 1);

                switch (state) {
                    case states.main:
                        switch (ch) {
                            case "'":
                                result += ch;
                                state = states.stringStarted;
                                break;
                            case "-":
                                state = states.isSingleLineComment;
                                break;
                            case "/":
                                state = states.isMultiLineComment;
                                break;
                            case "\t":
                            case " ":
                                state = states.inWhitespace;
                                break;
                            case "\n":
                                state = states.inNewLine;
                                break;
                            case "[":
                                result += ch;
                                state = states.inBracket;
                                break;
                            default:
                                result += ch;
                                break;
                        }

                        break;
                    case states.stringStarted:
                        result += ch;

                        if (ch == "'") {
                            state = states.main;
                        }

                        break;
                    case states.isSingleLineComment:
                        if (ch == "-") {
                            state = states.singleLineComment;
                        } else {
                            result += "-" + ch;
                            state = states.main;
                        }

                        break;
                    case states.singleLineComment:
                        if (ch == "\n") {
                            state = states.main;
                        }
                        break;
                    case states.isMultiLineComment:
                        if (ch == "*") {
                            state = states.multiLineComment;
                        } else {
                            result += "/" + ch;
                            state = states.main;
                        }

                        break;
                    case states.multiLineComment:
                        if (ch == "*") {
                            state = states.isMultiLineCommentEnding;
                        }
                        break;
                    case states.isMultiLineCommentEnding:
                        if (ch == "/") {
                            state = states.main;
                        } else {
                            state = states.multiLineComment;
                        }
                        break;
                    case states.inWhitespace:
                        if (ch == "\n" || ch == "\r") {
                            result += ch;
                            state = states.main;
                        } else if (ch == "[") {
                            result += " " + ch;
                            state = states.inBracket;
                        } else if (ch != " " && ch != "\t") {
                            result += " " + ch;
                            state = states.main;
                        }
                        break;
                    case states.inNewLine:
                        if (ch != "\n" && ch != "\t" && ch != " ") {
                            result += "\n" + ch;
                            state = states.main;
                        }
                        break;
                    case states.inBracket:
                        result += ch;
                        
                        if (ch == "]") {
                            state = states.main;
                        }
                        break;
                }

                i++;

                if (i == query.length) {
                    break;
                }
            }
        }

        return result;
    }
}

export default DbHelperSqlServer;