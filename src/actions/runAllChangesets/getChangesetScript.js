import fs from "fs";
import renderChangesetScript from "../../utils/renderChangesetScript";
import { Exception } from "@locustjs/exception";

async function getChangesetScript(config, changeset, allFiles, i) {
    let error;
    let script;

    if (allFiles.length == 0 || config.forceMode) {
        if (fs.existsSync(changeset.sqlPath)) {
            config.debug(`${i}. ${changeset.name}: .sql found`);
            script = fs.readFileSync(changeset.sqlPath, "utf-8");
        } else {
            config.debug(`${i}. ${changeset.name}: .sql not found`);
            error = new Exception(`changeset ${changeset.name} .sql file not found.`);
        }
    } else {
        const rs = await renderChangesetScript(config, changeset.path, changeset.name, [], allFiles);

        if (rs.error) {
            config.debug(`${i}. ${changeset.name}: render error`);
            error = rs.error;
        } else {
            config.debug(`${i}. ${changeset.name}: .sql generated`);
            script = rs.script;
        }
    }

    return { error, script }
}

export default getChangesetScript;