import getChangesetContent from "./getChangesetContent.js";
import testScript from "../testScript";
import executeChangeset from "./executeChangeset";
import compareWithOrigin from "../../utils/compareWithOrigin.js";

async function run(config) {
    if (compareWithOrigin(config)) {
        let { content, error } = await getChangesetContent(config);

        if (content) {
            error = await testScript(config, content);

            if (!error) {
                error = await executeChangeset(config, content);
            }
        }

        return error;
    } else {
        return config.error;
    }

}

export default run;