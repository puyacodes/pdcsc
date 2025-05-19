import fs from "fs";
import path from "path";
import { Exception } from "@locustjs/exception";
import getNewChangeset from "./getNewChangeset";
import chalk from "chalk";
import getChangesetHeader from "../../utils/getChangesetHeader";
import getSectionHeader from "../../utils/getSectionHeader";
import getOrderedSections from "../../utils/getOrderedSections";

function createNewChangeset(config) {
    let changeset;
    let changesetFilePath;

    try {
        const cs = getNewChangeset(config);

        const content = getChangesetHeader(config) +
            (config.fullChangeset ? "\n" + getOrderedSections().map(section => getSectionHeader(section) + "\n").join("\n") : "");
        changeset = cs.changeset;
        changesetFilePath = cs.changesetFilePath;

        fs.writeFileSync(changesetFilePath, content);

        console.log(`New changeset ${chalk.cyan(path.parse(changeset).name)} created.`)
    } catch (ex) {
        if (changeset) {
            throw new Exception(`Generating new changeset ${chalk.cyan(path.parse(changeset).name)} failed`, ex);
        } else {
            throw new Exception(`Generating new changeset failed`, ex);
        }
    }

    return { changeset, changesetFilePath }
}

export default createNewChangeset;