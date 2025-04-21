import { Exception } from "@locustjs/exception";
import testScript from "../testScript";
import FileHelper from "../../services/FileHelper";
import getChangesetScript from "./getChangesetScript";

async function testPendingChangesets(config, pendingChangesets, allFiles) {
    let error;
    const scripts = {}

    console.log("Bundling and Testing pending changesets ...");

    try {
        const _scripts = []
        let i = 1;

        console.log("Getting scripts ...");

        for (let changeset of pendingChangesets) {
            let script;
            const cr = await getChangesetScript(config, changeset, allFiles, i);

            if (cr.error) {
                error = cr.error;
                break;
            } else {
                script = cr.script;

                scripts[changeset.name] = cr.script;
            }

            _scripts.push(script);

            i++;
        }

        if (!error) {
            console.log("Bundling ...");

            const all = _scripts.join("\ngo\n");

            if (config.debugMode) {
                FileHelper.createFile(config.paths.scriptsPath, "all.sql", all);
            }

            console.log("Testing bundle ...");

            error = await testScript(config, all);
        }
    } catch (ex) {
        error = new Exception("Bundling/testing pending changesets was not successful.", ex);
    }

    return { error, scripts };
}

export default testPendingChangesets;