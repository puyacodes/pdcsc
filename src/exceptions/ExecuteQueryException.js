const { Exception } = require('@locustjs/exception');

class ExecuteQueryException extends Exception {
    constructor(query, ...args) {
        super(...args);

        this.query = query;
    }
}

module.exports = { ExecuteQueryException }