import { Exception } from "@locustjs/exception";

class GitInitException extends Exception {
    constructor(...args) {
        super(...args);

        this.message = "initializing git repository failed";
    }
}

export default GitInitException;