import { throwIfInstantiateAbstract, throwNotImplementedException } from "@locustjs/exception";

class BaseSqlMinifier {
    constructor(config) {
        throwIfInstantiateAbstract(BaseSqlMinifier, this);

        this.config = Object.assign({}, config)
    }
    minify(query) {
        throwNotImplementedException(`${this.constructor.name}.minify`, this);
    }
}

export default BaseSqlMinifier;