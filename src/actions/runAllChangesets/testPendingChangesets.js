import fs from "fs";
import { Exception } from "@locustjs/exception";
import testScript from "../testScript";
import renderChangesetScript from "../../utils/renderChangesetScript";
import FileHelper from "../../services/FileHelper";
import getChangesetScript from "./getChangesetScript";

async function testPendingChangesets(config, pendingChangesets, allFiles) {
    let error;
    const scripts = {}
    config.debug("Testing changesets ...");

    try {
        const _scripts = []

        for (let changeset of pendingChangesets) {
            let script;
            const cr = await getChangesetScript(config, changeset, allFiles);

            if (cr.error) {
                error = cr.error;
                break;
            } else {
                script = cr.script;

                scripts[changeset.name] = cr.script;
            }

            _scripts.push(script);
        }

        if (!error) {
            const all = _scripts.join("\ngo\n");

            if (config.debugMode) {
                FileHelper.createFile(path.join(config.paths.scriptsPath, "all.sql"));
            }

            error = await testScript(config, all);
        } else {
            console.log("Operation aborted.")
        }
    } catch (ex) {
        error = new Exception("Bundling changesets failed.", ex);
    }

    return { error, scripts };
}

export default testPendingChangesets;