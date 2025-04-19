import fs from "fs";
import path from "path";
import extractDateFromString from "../../utils/extractDateFromString";

function getPendingChangesets(config, lastExecutedChangeset) {
    const files = fs.readdirSync(config.paths.changesetsPath);
    const changesets = files
        .filter(changeset => path.extname(changeset) == ".txt")
        .map(filepath => path.parse(filepath).name)
        .map(name => ({
            name,
            path: path.join(config.paths.changesetsPath, name + ".txt"),
            sqlPath: path.join(config.paths.changesetsPath, name + ".sql")
        }));
    const lastExecutedChangesetName = lastExecutedChangeset?.name;
    const lastExecutedDate = lastExecutedChangesetName ? extractDateFromString(config, lastExecutedChangesetName) : null;
    let pendingChangesets = [];

    for (const file of changesets) {
        const match = file.name.match(/^(\d{14})/);

        if (!match) {
            continue;
        }

        let fileDateStr = match[1]; //example: 14030125094518
        let fileDate = extractDateFromString(config, fileDateStr);

        if (!lastExecutedDate || fileDate > lastExecutedDate) {
            if (!file.name.includes("update")) {
                pendingChangesets.push({ ...file, date: fileDate });
            }
        }
    }

    config.debug("pending Changesets", pendingChangesets.map(changeset => changeset.name));

    pendingChangesets.sort((a, b) => a.date - b.date);

    if (pendingChangesets.length === 0) {
        console.log("No new changesets found. Database is up-to-date.");
    }

    return pendingChangesets;
}

export default getPendingChangesets;