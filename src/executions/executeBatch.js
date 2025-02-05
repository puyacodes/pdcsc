const { executeQuery } = require("../executions/executeQuery");

async function executeBatch(props) {
    var parts = props.content.split(/\s+GO\s+/i);

    for (let part of parts) {
        await executeQuery({ query: part, dbName: props.dbName, config: props.config });
    }
}

module.exports = { executeBatch }