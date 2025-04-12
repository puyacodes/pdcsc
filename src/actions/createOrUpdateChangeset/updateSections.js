import chalk from "chalk";
import path from "path";
import { equals } from "../../extensions/equals";
import { isNullOrEmpty } from "@locustjs/base";

function updateSections(config, allFiles) {
    const { folders, sections, finalDeleteds, finalChanges } = config;

    config.debug("Updating sections with new changes ...");
    config.debug2({ finalDeleteds })

    config.debug2("\nadding new changes to sections ...");

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

    config.debug2("\nremoving changeset items that are deleted ...");

    finalDeleteds.forEach(file => {
        let fileName = path.basename(file);
        let dotIndex = fileName.indexOf(".");
        let nonSchemaFileName = dotIndex >= 0 ? fileName.substr(dotIndex + 1) : "";

        config.debug3(`\tdeleted file = ${chalk.yellow(file)}`);

        for (const [section, folder] of Object.entries(folders)) {
            if (file.contains(`${config.paths.scriptsFolderName}/${folder}/`)) {
                if (sections[section].contains(fileName) || sections[section].contains(nonSchemaFileName)) {
                    if (finalDeleteds.contains(file)) {
                        console.warn(`${chalk.yellow("Warning: ")}${chalk.red(fileName)} ${chalk.yellow(" removed from changeset (its file is deleted).")}\n`);

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

    config.debug2("\nchecking if items exist ...");

    for (const [section, folder] of Object.entries(folders)) {
        for (let item of sections[section]) {
            let found = false;

            for (const filePath of allFiles) {
                const fileName = path.basename(filePath);

                if (filePath.contains(folder) && fileName.contains(item)) {
                    found = true;

                    break;
                }
            }

            if (!found) {
                config.error = `The source file for changeset item ${chalk.yellow(item)} in ${chalk.yellow(folder)} folder was not found.`;

                break
            }
        }

        if (config.error) {
            break;
        }
    }

    return isNullOrEmpty(config.error);
}

export default updateSections;