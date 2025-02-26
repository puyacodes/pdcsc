import path from "path";
import checkChangesetExistence from "./checkChangesetExistence";
import createNewChangeset from "./createNewChangeset";

async function getOrCreateChangeset(config) {
    let result = true;
    let changesetExists = false;
    let { changesetsPath } = config.paths;

    if (!config.changeset) {
        const cce = checkChangesetExistence(config);

        changesetExists = cce.changesetExists;

        if (!cce.exit) {
            if (changesetExists) {
                config.changeset = cce.changeset;
                config.changesetFilePath = path.join(changesetsPath, config.changeset);
            } else {
                createNewChangeset(config);
            }
        } else {
            result = false;
        }
    } else {
        changesetExists = true;
    }

    const cleanFilename = path.parse(config.changeset).name;

    config.changesetTemp = `${cleanFilename}~.txt`;
    config.changesetTempFilePath = path.join(changesetsPath, config.changesetTemp);
    config.scriptTempFilePath = path.join(changesetsPath, `${cleanFilename}~.sql`);
    config.scriptFilePath = path.join(changesetsPath, `${cleanFilename}.sql`);

    config.isNewChangeset = !changesetExists;

    return result;
}

export default getOrCreateChangeset;