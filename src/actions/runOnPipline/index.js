import getChangesetContent from "./getChangesetContent.js";
import testScript from "../testScript";
import executeChangeset from "./executeChangeset";
import compareWithOrigin from "../../utils/compareWithOrigin.js";
import addChangesetToDatabase from "../runAllChangesets/addChangesetToDatabase.js";

async function run(config) {
    if (await compareWithOrigin(config)) {
        let { content, error, changesetName } = await getChangesetContent(config);

        if (content) {
            error = await testScript(config, content);

            if (!error) {
                error = await executeChangeset(config, content);

                if (!error) {
                    error = await addChangesetToDatabase(config, { name: changesetName });
                }
            }
        }

        return error;
    } else {
        return config.error;
    }
}

export default run;