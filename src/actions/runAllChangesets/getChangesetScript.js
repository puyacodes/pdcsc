import fs from "fs";
import { Exception } from "@locustjs/exception";

async function getChangesetScript(config, changeset, i) {
    let error;
    let script;

    if (fs.existsSync(changeset.sqlPath)) {
        config.debug1(`${i}. ${changeset.name}: script found`);
        script = fs.readFileSync(changeset.sqlPath, "utf-8");
    } else {
        config.debug1(`${i}. ${changeset.name}: script not found`);
        error = new Exception(`changeset ${changeset.name} script was not found.`);
    }

    return { error, script }
}

export default getChangesetScript;