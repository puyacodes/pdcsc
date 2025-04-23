import { throwIfInstantiateAbstract, throwNotImplementedException } from "@locustjs/exception";

class BaseSqlUglifier {
    constructor(config) {
        throwIfInstantiateAbstract(BaseSqlUglifier, this);

        this.config = Object.assign({}, config)
    }
    uglify(query) {
        throwNotImplementedException(`${this.constructor.name}.uglify`, this);
    }
}

export default BaseSqlUglifier;