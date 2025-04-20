import renderChangesetScript from "../../utils/renderChangesetScript";
import { isNullOrEmpty, isNumeric } from '@locustjs/base';
import path from "path";
import fs from "fs";
import promptUser from "../../utils/promptUser";

async function renderChangeset(config) {
    let error;
    let { paths, changeset } = config;
    let exit = false;

    if (isNullOrEmpty(changeset)) {
        console.log(`List of changesets:\n`);

        const files = fs.readdirSync(paths.changesetsPath);
        const changesets = files
            .filter(changeset => path.extname(changeset) == ".txt")
            .map(filepath => path.parse(filepath).name);

        while (isNullOrEmpty(changeset)) {
            changesets.forEach((x, i) => console.log(`${i + 1}. ${x}`));

            let answer = await promptUser(`\nPlease specify changeset (1-${changesets.length}, 0 = exit)? `);

            if (!isNumeric(answer)) {
                console.log(`\nInvalid value\n`);
                continue;
            }

            if (answer == "0") {
                exit = true;
                break;
            } else {
                answer = parseInt(answer);

                if (answer < 1 || answer > changesets.length) {
                    console.log(`\nNumber must be between ${1} and ${changesets.length}\n`);
                } else {
                    changeset = changesets[answer - 1];
                    break;
                }
            }
        }
    }

    if (!exit) {
        if (!changeset.endsWith(".txt")) {
            changeset = changeset + ".txt";
        }

        config.debug(`Selected changeset = ${changeset}`)

        const changesetFilePath = path.join(paths.changesetsPath, changeset);
        const cleanChangesetName = path.parse(changesetFilePath).name;
        const scriptFilePath = path.join(paths.changesetsPath, `${cleanChangesetName}.sql`);

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