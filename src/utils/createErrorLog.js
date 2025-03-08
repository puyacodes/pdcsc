import fs from "fs";
import path from "path";
import { ExecuteQueryException } from "../services/DbHelper/exceptions/index.js";
import { Exception } from "@locustjs/exception";

function createErrorLog(config, ex) {
    const { paths } = config;
    const { changesetsPath } = paths;
    const { query } = ex;
    let error;

    if (ex instanceof ExecuteQueryException) {
        ex.query = null;
    }

    const logFile = path.join(changesetsPath, "error.log");

    error = new Exception(`Error during script execution. see '${logFile}' for more details.`, ex);

    try {
        fs.writeFileSync(logFile, "", "utf-8");

        try {
            fs.appendFileSync(logFile, JSON.stringify(ex, null, 4) + "\n\n", "utf-8");
        } catch (e) {
            let msg = e.message || e;

            fs.appendFileSync(logFile, msg + "\n\n", "utf-8");

            msg = ex.message || ex;

            fs.appendFileSync(logFile, msg + "\n\n", "utf-8");
        }

        if (query) {
            fs.appendFileSync(logFile, query + "\n\n", "utf-8");
        }
    } catch (ex) {
        console.error(`Error creating log file`, ex);
    }

    return error;
}

export default createErrorLog;