const { ConsoleLogger } = require("@locustjs/logging");
const { Exception } = require("@locustjs/exception");

const logger = new ConsoleLogger({ env: "node", store: {} });

function f1() {
    logger.enterScope(f1);

    logger.info("hello world", { a: 10 })
    logger.log("hello world", { a: 10 })
    logger.debug("hello world", { a: 10 })
    logger.warn("hello world", { a: 10 })
    logger.success("hello world", { a: 10 })
    logger.danger("hello world", { a: 10 })
    logger.fail("hello world", { a: 10 })
    logger.cancel("hello world", { a: 10 })
    logger.abort("hello world", { a: 10 })
    logger.suggest("hello world", { a: 10 })
    logger.trace("hello world", { a: 10 })

    logger.exitScope();
}

f1();