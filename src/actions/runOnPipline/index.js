import getChangesetContent from "./getChangesetContent.js";
import testScript from "../testScript";
import executeChangeset from "./executeChangeset";

async function run(config) {
    let error;
    const content = getChangesetContent(config);

    if (content) {
        let error = await testScript(config, content);

        if (!error) {
            error = await executeChangeset(config, content);
        }
    }

    return error;
}

export default run;