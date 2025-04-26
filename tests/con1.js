import DbHelperSqlServer from "../src/services/DbHelper/DbHelperSqlServer";

const config = {
    server: "192.168.10.119",
    user: "sa",
    password: "Rotart314",
    database: "PuyaDbMain",
    encrypt: false
}

async function start() {
    const db = new DbHelperSqlServer(config)

    try {
        await db.dbExists(config.database);

        console.log(`database exists`)
    } catch (ex) {
        console.log(ex.toString());
    }
}

start().catch(console.log);