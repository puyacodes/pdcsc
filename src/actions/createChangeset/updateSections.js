import path from "path";

function updateSections(config, sections, allChanges) {
    const { folders } = config;

    allChanges.forEach((file) => {
        let fileName = path.basename(file);

        if (fileName.toLowerCase().startsWith("dbo.")) {
            fileName = fileName.substring(4);
        }

        for (const [section, folder] of Object.entries(folders)) {
            if (file.includes(`${config.paths.scriptsFolderName}/${folder}/`)) {
                if (!sections[section].includes(fileName)) {
                    sections[section].push(fileName);
                }
            }
        }
    });

    return sections;
}

export default updateSections;