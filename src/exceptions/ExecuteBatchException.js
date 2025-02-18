const { Exception } = require('@locustjs/exception');

class ExecuteBatchException extends Exception {
    constructor(query, ...args) {
        super(...args);

        this.query = query;
    }
}

module.exports = { ExecuteBatchException }