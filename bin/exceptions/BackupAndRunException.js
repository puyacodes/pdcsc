const { Exception } = require("@locustjs/exception");

class BackupAndRunException extends Exception { }

module.exports = { BackupAndRunException }