import getChangesetContent from "./getChangesetContent.js";
import testScript from "../testScript";
import executeChangeset from "./executeChangeset";

async function run(config) {
    let error;
    const content = await getChangesetContent(config);

    if (content) {
        // Todo
        // if there is a git commit after last pdcsc execution,
        // we should stop pipeline and generate error.
        // user must always use pdcsc.

        let error = await testScript(config, content);

        if (!error) {
            error = await executeChangeset(config, content);
        }
    }

    return error;
}

export default run;