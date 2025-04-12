import fs from "fs";
import path from "path";
import getNewChangeset from "./getNewChangeset";
import commitChanges from "../../utils/commitChanges";
import { Exception } from "@locustjs/exception";
import chalk from 'chalk';
import { isNullOrEmpty } from "@locustjs/base";

async function updateChangesetTimestampIfNeeded(config) {
    let { changesetsPath } = config.paths;

    if (!config.changeset && config.oldChangeset) {
        try {
            const changes = [];
            const cs = getNewChangeset(config);

            config.newChangeset = cs.changeset;
            config.newChangesetName = path.parse(config.newChangeset).name;
            config.newChangesetFilePath = cs.changesetFilePath;

            changes.push(config.oldChangesetFilePath);
            changes.push(cs.changesetFilePath);

            fs.renameSync(config.oldChangesetFilePath, cs.changesetFilePath);

            const oldSqlFileName = config.oldChangesetName + '.sql';
            config.oldSqlFilePath = path.join(changesetsPath, oldSqlFileName);

            if (fs.existsSync(config.oldSqlFilePath)) {
                const newSqlFileName = config.newChangesetName + '.sql';
                const newSqlFilePath = path.join(changesetsPath, newSqlFileName);

                fs.renameSync(config.oldSqlFilePath, newSqlFilePath);
            }

            // we directly commit changeset timestamp update.
            // this is necessary. we do not ask user consent on this.

            config.error = await commitChanges(changes, `pdcsc: changeset timestamp updated.
${config.oldChangesetName} => ${config.newChangesetName}`);

            if (!config.error) {
                config.debug(`Changeset timestamp updated.`);
                config.debug2(`  old: ${chalk.blue(config.oldChangesetName)}, new: ${chalk.cyan(config.newChangesetName)}`);
            } else {
                config.error = new Exception(`Updating changeset timestamp failed (old: ${config.oldChangesetName}, new: ${config.newChangesetName}).`, config.error);
            }
        } catch (ex) {
            config.error = new Exception(`updating changeset timestamp failed.`, ex);
        }
    }

    return isNullOrEmpty(config.error);
}

export default updateChangesetTimestampIfNeeded;