import fs from "fs";
import path from "path";
import extractDateFromString from "../../utils/extractDateFromString";
import chalk from "chalk";

function getPendingChangesets(config, lastExecutedChangeset, executedChangesets) {
    console.log("Getting pending changesets ...");
    const result = [];
    const files = fs.readdirSync(config.paths.changesetsPath);
    const changesets = files
        .filter(filepath => path.extname(filepath) == ".txt" && extractDateFromString(config, filepath))
        .map(filepath => path.parse(filepath).name)
        .map(name => ({
            name,
            path: path.join(config.paths.changesetsPath, name + ".txt"),
            sqlPath: path.join(config.paths.changesetsPath, name + ".sql"),
            date: extractDateFromString(config, name)
        }));

    // ensure changesets that are older than lastExecutedChangeset will be also executed on database.
    // this happens when we ahve two or more teams who have distinct workflows (each team has their
    // own dev branch on which they merge their branches with).
    console.log("\tchecking older changesets ...");
    
    changesets.forEach(changeset => {
        if (!executedChangesets.find(cs => changeset.name.equals(cs.name))) {
            config.debug2(`\t\tadded changeset ${chalk.yellow(changeset.name)}`);

            result.push(changeset);
        }
    });

    const lastExecutedChangesetName = lastExecutedChangeset?.name;
    const lastExecutedDate = lastExecutedChangesetName ? extractDateFromString(config, lastExecutedChangesetName) : null;

    console.log("\tchecking newer changesets ...");

    for (const changeset of changesets) {
        const match = changeset.name.match(/^(\d{14})/);

        if (!match) {
            continue;
        }

        if (!lastExecutedDate || changeset.date > lastExecutedDate) {
            config.debug2(`\t\tadded changeset ${chalk.yellow(changeset.name)}`);

            result.push(changeset);
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