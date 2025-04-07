import path from "path";
import createNewChangeset from "./createNewChangeset";
import chalk from "chalk";

function getOrCreateChangeset(config) {
    let { changesetsPath } = config.paths;

    // Todo: Done
    // we should look up changeset not just by branch name, but also by branch hash.

    // Todo: Done
    // there is no need to check whether current changeset is followed by other changesets and ...

    config.debug("Preparing final changeset ...");

    if (!config.changeset) {
        if (!config.oldChangeset) {
            config.debug("No existing changeset found. Creating a new changeset ...");

            const cs = createNewChangeset(config);
            
            config.finalChangeset = cs.changeset;
            config.finalChangesetFilePath = cs.changesetFilePath;
            config.isNewChangeset = true;
        } else {
            config.debug("Working on existing changeset ...");

            config.finalChangeset = config.newChangeset;
            config.finalChangesetFilePath = config.newChangesetFilePath;
            config.isNewChangeset = false;    
        }
    } else {
        config.debug(`${chalk.yellow("Warning:")}: manual changeset specified (${chalk.cyan(config.changeset)}).`);

        config.finalChangeset = config.changeset;
        config.finalChangesetFilePath = config.changesetFilePath;
        config.isNewChangeset = false;
    }

    const cleanFilename = path.parse(config.finalChangeset).name;

    config.finalChangesetName = cleanFilename;
    config.changesetTemp = `${cleanFilename}~.txt`;
    config.changesetTempFilePath = path.join(changesetsPath, config.changesetTemp);
    config.scriptFilePath = path.join(changesetsPath, `${cleanFilename}.sql`);
    config.scriptTempFilePath = path.join(changesetsPath, `${cleanFilename}~.sql`);
}

export default getOrCreateChangeset;