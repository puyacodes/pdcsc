import getChangesetContent from "./getChangesetContent.js";
import testScript from "../testScript";
import executeChangeset from "./executeChangeset";
import compareWithOrigin from "../../utils/compareWithOrigin.js";
import addChangesetToDatabase from "../runAllChangesets/addChangesetToDatabase.js";
import ensureJournalTableCreated from "../runAllChangesets/ensureJournalTableCreated.js";
import checkIfGitRepo from "../../utils/checkIfGitRepo.js";

async function run(config) {
    let error;

    do {
        if (!await checkIfGitRepo(config)) {
            error = config.error;
            break;
        }

        if (!await compareWithOrigin(config)) {
            error = config.error;
            break;
        }

        error = await ensureJournalTableCreated(config);

        if (error) {
            break;
        }

        const gcr = await getChangesetContent(config);

        if (gcr.error) {
            error = gcr.error;
            break;
        }

        if (!gcr.content) {
            break;
        }

        error = await testScript(config, gcr.content);

        if (error) {
            break;
        }

        error = await executeChangeset(config, gcr.content);

        if (error) {
            break;
        }

        error = await addChangesetToDatabase(config, { name: gcr.changesetName });
    } while (false);

    return error;
}

export default run;