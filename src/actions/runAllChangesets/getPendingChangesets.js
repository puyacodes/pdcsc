import fs from "fs";
import path from "path";
import extractDateFromString from "../../utils/extractDateFromString";

function getPendingChangesets(config, lastExecutedChangeset) {
    console.log("Getting pending changesets ...");

    const files = fs.readdirSync(config.paths.changesetsPath);
    const changesets = files
        .filter(changeset => path.extname(changeset) == ".txt" && extractDateFromString(config, changeset))
        .map(filepath => path.parse(filepath).name)
        .map(name => ({
            name,
            path: path.join(config.paths.changesetsPath, name + ".txt"),
            sqlPath: path.join(config.paths.changesetsPath, name + ".sql")
        }));
    const lastExecutedChangesetName = lastExecutedChangeset?.name;
    const lastExecutedDate = lastExecutedChangesetName ? extractDateFromString(config, lastExecutedChangesetName) : null;
    const result = [];

    for (const file of changesets) {
        const match = file.name.match(/^(\d{14})/);

        if (!match) {
            continue;
        }

        let fileDateStr = match[1]; //example: 14030125094518
        let fileDate = extractDateFromString(config, fileDateStr);

        if (!lastExecutedDate || fileDate > lastExecutedDate) {
            if (!file.name.includes("update")) {
                result.push({ ...file, date: fileDate });
            }
        }
    }

    result.sort((a, b) => a.date - b.date);
    
    config.debug2("Pending Changesets", result.map(changeset => changeset.name));

    if (result.length === 0) {
        console.log("No pending changeset found. Database is up-to-date.");
    } else {
        console.log(`${result.length} changesets found.`);
    }

    return result;
}

export default getPendingChangesets;