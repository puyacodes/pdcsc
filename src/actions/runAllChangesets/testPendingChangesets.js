import { Exception } from "@locustjs/exception";
import fs from "fs";
import testScript from "../testScript";

function testPendingChangesets(config, pendingChangesets) {
    let error;

    try {
        const scripts = []

        for (let changeset of pendingChangesets) {
            const content = fs.readFileSync(changeset.path, "utf-8");

            scripts.push(content);
        }

        error = testScript(config, scripts.join("\ngo\n"));
    } catch (ex) {
        error = new Exception("Bundling changesets failed", ex);
    }

    return error;
}

export default testPendingChangesets;