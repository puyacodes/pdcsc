import fs from "fs";
import path from "path";
import extractDateFromString from "../../utils/extractDateFromString";

function getPendingChangesets(config, lastExecutedChangeset) {
    const changesets = fs.readdirSync(config.paths.changesetsPath);
    const sqlFiles = changesets
        .filter(changeset => path.extname(changeset) == ".sql")
        .map(filepath => ({
            name: path.parse(filepath).name,
            path: path.join(config.paths.changesetsPath, filepath)
        }));
    const lastExecutedChangesetName = lastExecutedChangeset?.name;
    const lastExecutedDate = lastExecutedChangesetName ? extractDateFromString(config, lastExecutedChangesetName) : null;
    let pendingChangesets = [];

    for (const file of sqlFiles) {
        const match = file.name.match(/(\d{12,14})/);

        if (!match) {
            continue;
        }

        let fileDateStr = match[1]; //example: 140311131345
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