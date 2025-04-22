import fs from "fs";
import { Exception } from "@locustjs/exception";

async function getChangesetScript(config, changeset, i) {
    let error;
    let script;

    if (fs.existsSync(changeset.sqlPath)) {
        config.debug2(`${i}. ${changeset.name}: .sql found`);
        script = fs.readFileSync(changeset.sqlPath, "utf-8");
    } else {
        config.debug2(`${i}. ${changeset.name}: .sql not found`);
        error = new Exception(`changeset ${changeset.name} .sql file not found.`);
    }

    return { error, script }
}

export default getChangesetScript;