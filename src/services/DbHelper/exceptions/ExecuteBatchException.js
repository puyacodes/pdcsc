import { Exception } from "@locustjs/exception";

class ExecuteBatchException extends Exception {
    constructor(query, ...args) {
        super(...args);

        this.query = query;
    }
}

export default ExecuteBatchException;