import fs from "fs";

// unused function
function getChangesetFiles(config, ext) {
    const { changesetsPath } = config.paths;
    let changesetFiles = fs.readdirSync(changesetsPath);

    if (ext) {
        ext = ext.toLowerCase();

        changesetFiles = changesetFiles.filter(file => file.toLowerCase().endsWith(ext));
    }

    return changesetFiles;
}

export default getChangesetFiles;