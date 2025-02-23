import path from "path";

function categorizeFiles({ filteredFiles, tempSections, config, folders }) {
    filteredFiles.forEach((file) => {
        let fileName = path.basename(file);

        if (fileName.toLowerCase().startsWith("dbo.")) {
            fileName = fileName.substring(4);
        }

        for (const [section, folder] of Object.entries(folders)) {
            if (file.includes(`${config.paths.scriptsFolderName}/${folder}/`)) {
                if (!tempSections[section].includes(fileName)) {
                    tempSections[section].push(fileName);
                    return;
                } else {
                    config.warn(`File '${fileName}' already exists in section '${section}'.`);
                }
            }
        }
    });

    return tempSections;
}

export default categorizeFiles;