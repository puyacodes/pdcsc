import fs from "fs";
import renderChangesetScript from "../../utils/renderChangesetScript";

async function getChangesetScript(config, changeset, allFiles) {
    let error;
    let script;

    if (allFiles.length == 0) {
        if (fs.existsSync(changeset.sqlPath)) {
            config.debug2(`${changeset.name}: found`);
            script = fs.readFileSync(changeset.sqlPath, "utf-8");
        } else {
            config.debug2(`${changeset.name}: .sql not found`);
            error = "changeset's .sql file not found and no Scripts directory found to dynamically render changeset.";
        }
    } else {
        const rs = await renderChangesetScript(config, changeset.path, changeset.name, [], allFiles);

        if (rs.error) {
            config.debug2(`${changeset.name}: render error`);
            error = rs.error;
        } else {
            config.debug2(`${changeset.name}: .sql generated`);
            script = rs.script;
        }
    }

    return { error, script }
}

export default getChangesetScript;