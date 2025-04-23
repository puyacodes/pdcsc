import { throwIfInstantiateAbstract, throwNotImplementedException } from "@locustjs/exception";

class BaseSqlObfuscator {
    constructor(config) {
        throwIfInstantiateAbstract(BaseSqlObfuscator, this);

        this.config = Object.assign({}, config)
    }
    obfuscate(query) {
        throwNotImplementedException(`${this.constructor.name}.obfuscate`, this);
    }
}

export default BaseSqlObfuscator;