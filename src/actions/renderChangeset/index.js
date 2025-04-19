import renderChangesetScript from "../../utils/renderChangesetScript";
import { isNullOrEmpty } from '@locustjs/base';
import path from "path";
import fs from "fs";

async function renderChangeset(config) {
    let error;
    let { changesetsPath, changeset } = config;

    if (!changeset.endsWith(".txt")) {
        changeset = changeset + ".txt";
    }

    if (isNullOrEmpty(changeset)) {
        error = `Please specify changeset.`;
    } else {
        const changesetFilePath = path.join(changesetsPath, changeset);
        const cleanChangesetName = path.parse(changesetFilePath).name;
        const scriptFilePath = path.join(changesetsPath, `${cleanChangesetName}.sql`);

        if (fs.existsSync(changesetFilePath)) {
            const rs = await renderChangesetScript(config, changesetFilePath, cleanChangesetName);

            if (!rs.error) {
                fs.writeFileSync(scriptFilePath, rs.script, "utf-8");

                console.log(`Changeset rendered.`)
            } else {
                error = rs.error;
            }
        } else {
            error = "Changeset not found.";
        }
    }

    return error;
}

export default renderChangeset;