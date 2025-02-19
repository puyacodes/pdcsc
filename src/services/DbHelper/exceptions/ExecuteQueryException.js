import { Exception } from "@locustjs/exception";

class ExecuteQueryException extends Exception {
    constructor(query, ...args) {
        super(...args);

        this.query = query;
    }
}

export default ExecuteQueryException;