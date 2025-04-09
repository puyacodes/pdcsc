import chalk from "chalk";
import path from "path";
import { equals } from "../../extensions/equals";

function updateSections(config, sections, allChanges, deleteds) {
    config.debug("Updating sections with new uncommitted changes ...");
    config.debug2({ deleteds })

    const { folders } = config;

    allChanges.forEach((file) => {
        let fileName = path.basename(file);
        let dotIndex = fileName.indexOf(".");
        let nonSchemaFileName = dotIndex >= 0 ? fileName.substr(dotIndex + 1): "";

        for (const [section, folder] of Object.entries(folders)) {
            if (file.contains(`${config.paths.scriptsFolderName}/${folder}/`)) {
                if (sections[section].contains(fileName) || sections[section].contains(nonSchemaFileName)) {
                    if (deleteds.contains(file)) {
                        console.warn(`${chalk.yellow("Warning: ")}${fileName} removed from changeset (its file is deleted).\n`)

                        const index = sections[section].findIndex(x => equals(x, fileName) || equals(x, nonSchemaFileName));

                        sections[section].splice(index, 1);
                    }
                } else {
                    if (!deleteds.contains(file)) {
                        config.debug3("pushing new item in section", { section, fileName })

                        sections[section].push(fileName);
                    }
                }
            }
        }
    });

    return sections;
}

export default updateSections;