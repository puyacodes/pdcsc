import fs from "fs";
import { Exception } from "@locustjs/exception";
import testScript from "../testScript";

async function testPendingChangesets(config, pendingChangesets) {
    let error;

    config.debug("Testing changesets ...");

    try {
        const scripts = []

        for (let changeset of pendingChangesets) {
            config.debug2(changeset);
            
            const content = fs.readFileSync(changeset.path, "utf-8");

            scripts.push(content);
        }

        error = await testScript(config, scripts.join("\ngo\n"));
    } catch (ex) {
        error = new Exception("Bundling changesets failed", ex);
    }

    return error;
}

export default testPendingChangesets;