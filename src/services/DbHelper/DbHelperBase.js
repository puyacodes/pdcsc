import { throwIfInstantiateAbstract, throwIfInvalid, throwIfNotObject, throwIfNotSomeString, throwNotImplementedException } from '@locustjs/exception';

class DbHelperBase {
    constructor(config) {
        throwIfInstantiateAbstract(DbHelperBase, this);

        this.config = Object.assign({}, config)
    }
    executeQuery({ query, dbName, noCatch = true }) {
        throwNotImplementedException(`${this.constructor.name}.executeQuery`, this);
    }
    async executeBatch({ content }) {
        throwNotImplementedException(`${this.constructor.name}.executeBatch`, this);
    }
    async dbExists(dbName) {
        throwNotImplementedException(`${this.constructor.name}.dbExists`, this);
    }
}

export default DbHelperBase;