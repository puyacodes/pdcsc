import chalk from "chalk";
import path from "path";
import { equals } from "../../extensions/equals";

function updateSections(config, sections, finalChanges, finalDeleteds) {
    config.debug("Updating sections with new uncommitted changes ...");
    config.debug2({ deleteds: finalDeleteds })

    const { folders } = config;

    config.debug2("Adding new changes to sections ...");

    finalChanges.forEach((file) => {
        let fileName = path.basename(file);
        let dotIndex = fileName.indexOf(".");
        let nonSchemaFileName = dotIndex >= 0 ? fileName.substr(dotIndex + 1) : "";

        config.debug3(`\tchange = ${chalk.yellow(file)}`);

        for (const [section, folder] of Object.entries(folders)) {
            if (file.contains(`${config.paths.scriptsFolderName}/${folder}/`)) {
                if (sections[section].contains(fileName) || sections[section].contains(nonSchemaFileName)) {
                    if (finalDeleteds.contains(file)) {
                        console.warn(`${chalk.yellow("Warning: ")}${fileName} removed from changeset (its file is deleted).\n`)

                        const index = sections[section].findIndex(x => equals(x, fileName) || equals(x, nonSchemaFileName));

                        if (index >= 0) {
                            config.debug3(`\t\tsection: ${chalk.yellow(section)}: removed`)
    
                            sections[section].splice(index, 1);
                        } else {
                            config.debug3(`\t\tsection: ${chalk.yellow(section)}: item not found!`);
                        }
                    } else {
                        config.debug3(`\t\tsection: ${chalk.yellow(section)}: already exists`);
                    }
                } else {
                    if (!finalDeleteds.contains(file)) {
                        config.debug3(`\t\tsection: ${chalk.yellow(section)}: added`);

                        sections[section].push(fileName);
                    } else {
                        config.debug3(`\t\tsection: ${chalk.yellow(section)}: skipped (deleted)`);
                    }
                }
            }
        }
    });

    config.debug2("Removing changeset items that are deleted ...");

    finalDeleteds.forEach(file => {
        let fileName = path.basename(file);
        let dotIndex = fileName.indexOf(".");
        let nonSchemaFileName = dotIndex >= 0 ? fileName.substr(dotIndex + 1) : "";

        config.debug3(`\tdeleted file = ${chalk.yellow(file)}`);

        for (const [section, folder] of Object.entries(folders)) {
            if (file.contains(`${config.paths.scriptsFolderName}/${folder}/`)) {
                if (sections[section].contains(fileName) || sections[section].contains(nonSchemaFileName)) {
                    if (finalDeleteds.contains(file)) {
                        console.warn(`${chalk.yellow("Warning: ")}${fileName} removed from changeset (its file is deleted).\n`)

                        const index = sections[section].findIndex(x => equals(x, fileName) || equals(x, nonSchemaFileName));

                        if (index >= 0) {
                            config.debug3(`\t\tsection: ${chalk.yellow(section)}: removed`);
    
                            sections[section].splice(index, 1);
                        } else {
                            config.debug3(`\t\tsection: ${chalk.yellow(section)}: item not found!`);
                        }
                    }
                }
            }
        }
    })

    return sections;
}

export default updateSections;