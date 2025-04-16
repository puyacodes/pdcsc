const { executeQuery } = require("../executions/executeQuery");

async function executeBatch(props) {
    // try {
        var parts = props.content.split(/\s+GO\s+/i);
        var i = 0;

        for (let part of parts) {

            await executeQuery({ query: part, dbName: props.dbName, config: props.config });

            i++;
        }
    // } catch (error) {
        
    // }
}

module.exports = { executeBatch }