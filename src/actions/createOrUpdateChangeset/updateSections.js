import path from "path";

function updateSections(config, sections, allChanges, deleteds) {
    config.debug("Updating sections with new uncommitted changes ...");

    const { folders } = config;

    allChanges.forEach((file) => {
        let fileName = path.basename(file);

        // QUESTION: why we should omit dbo. prefix.
        //           this can lead to bugs.
        if (fileName.toLowerCase().startsWith("dbo.")) {
            fileName = fileName.substring(4);
        }

        config.debug2({ deleteds })

        for (const [section, folder] of Object.entries(folders)) {
            if (file.includes(`${config.paths.scriptsFolderName}/${folder}/`)) {
                if (!sections[section].includes(fileName) && !deleteds.includes(fileName)) {
                    config.debug3("pushing new item in section", { section, fileName })

                    sections[section].push(fileName);
                }
            }
        }
    });

    return sections;
}

export default updateSections;