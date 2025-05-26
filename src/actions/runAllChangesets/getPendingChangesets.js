import fs from "fs";
import path from "path";
import extractDateFromString from "../../utils/extractDateFromString";
import chalk from "chalk";
import { isSomeArray } from "@locustjs/base";

function getPendingChangesets(config, executedChangesets) {
    console.log("Getting pending changesets ...");

    const firstExecutedChangeset = isSomeArray(executedChangesets) ? executedChangesets[0] : null;
    const lastExecutedChangeset = isSomeArray(executedChangesets) ? executedChangesets[executedChangesets.length - 1] : null;

    if (firstExecutedChangeset) {
        console.log(`First ${lastExecutedChangeset == firstExecutedChangeset ? "and Last " : ""}executed changeset: ${chalk.cyan(firstExecutedChangeset.name)}.`)

        if (lastExecutedChangeset && lastExecutedChangeset != firstExecutedChangeset) {
            console.log(`Last executed changeset: ${chalk.cyan(lastExecutedChangeset.name)}.`)
        }
    }

    let result = [];
    const files = fs.readdirSync(config.paths.changesetsPath);
    const changesets = files
        .filter(filepath => path.extname(filepath) == ".txt" && extractDateFromString(config, filepath))
        .map(filepath => path.parse(filepath).name)
        .filter(filename => filename.match(/^(\d{14})/))
        .map(name => ({
            name,
            path: path.join(config.paths.changesetsPath, name + ".txt"),
            sqlPath: path.join(config.paths.changesetsPath, name + ".sql"),
            date: extractDateFromString(config, name)
        }));

    changesets.sort((a, b) => a.date - b.date);

    const firstExecutedChangesetName = firstExecutedChangeset?.name;
    const firstExecutedDate = firstExecutedChangesetName ? extractDateFromString(config, firstExecutedChangesetName) : null;

    const lastExecutedChangesetName = lastExecutedChangeset?.name;
    const lastExecutedDate = lastExecutedChangesetName ? extractDateFromString(config, lastExecutedChangesetName) : null;

    if (!firstExecutedChangeset) {
        // database journal is empty.
        // we should execute ALL changesets (from the begining of time
        // to current date) on the database.

        console.log("Journal is empty, all changesets are pended.");

        result = changesets;
    } else if (changesets.some(changeset => changeset.date < firstExecutedDate)) {
        // this is a rare case and should not normally happen.
        // it means that we have old changesets that were not executed on the database.
        // this is an alarming situation.

        console.warn(chalk.yellow("WARNING: found old changesets before first one."));
        console.warn(chalk.yellow("\tRestarted changeset execution from the begining of time ..."));

        // if we found at least one changeset that is older than the first executed changeset,
        // we have no choice but to executed ALL changesets on the database, both older ones
        // and even those that were executed and journaled.

        // we must do this so that the database is placed in a correct state.
        // (ALL changesets are executed in a CORRECT order).

        // we must perform the execution with the first changeset in timeline, since
        // we cannot determine how far we shoould go back.

        result = changesets;
    } else {
        // we loop through all changesets and add any changeset that is not executed
        // on the database to the final result (pending changesets).
        // this seems rational at first glance.

        // however, there is a critical potential bug lurking here.
        // when we have two or more teams with distinct workflows (each team has their
        // own dev branches), changeset of a team can damage another team's work.
        // sadly there is no workaround for such problem that could be avoided
        // automatically by a tool such as pdcsc.
        // the only workaround is manual synchronization through face-to-face cooperation
        // among the teams.
        // so, it is recommended for teams to manually merge other teams' dev branches into
        // their dev branch and then try to merge their dev branch to main branch.

        // anyhow, when looping through changeset, if we find a changeset prior to
        // last executed changeset, we don't care anymore that next changesets are executed
        // on the database or not. from that point forward, we must executed the changesets
        // on the database.

        let foundOldChangeset = false;

        for (let changeset of changesets) {
            const foundExecutedChangeset = executedChangesets.find(cs => changeset.name.equals(cs.name)) != null;

            if (foundOldChangeset) {
                if (!foundExecutedChangeset) {
                    config.debug2(`\t\tadded missing changeset ${chalk.yellow(changeset.name)}`);
                } else {
                    config.debug2(`\t\tre-executing changeset ${chalk.yellow(changeset.name)}`);
                }

                result.push(changeset);

                continue;
            }

            if (!foundExecutedChangeset) {
                if (changeset.date < lastExecutedDate) {
                    foundOldChangeset = true;

                    config.debug2(`\t\t${chalk.red("CONFLICT POINT")}`);
                }

                config.debug2(`\t\tadded missing changeset ${chalk.yellow(changeset.name)}`);

                result.push(changeset);
            }
        }

    }

    if (result.length) {
        config.debug2("Pending Changesets", result.map(changeset => changeset.name));

        console.log(`${result.length} changesets found.`);
    }

    return result;
}

export default getPendingChangesets;