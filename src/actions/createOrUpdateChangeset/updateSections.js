import chalk from "chalk";
import path from "path";
import { equals } from "../../extensions/equals";
import { isNullOrEmpty } from "@locustjs/base";

function updateSections(config, allFiles) {
    const { folders, sections, finalDeleteds, finalChanges } = config;

    config.debug("Updating sections with new changes ...");
    config.debug2({ finalDeleteds })

    config.debug("\nadding new changes to sections ...");

    finalChanges.forEach((file) => {
        let fileName = path.basename(file);
        let dotIndex = fileName.indexOf(".");
        let nonSchemaFileName = fileName.split(".").length > 2 && dotIndex >= 0 ? fileName.substr(dotIndex + 1) : "";

        config.debug3(`\tchange = ${chalk.yellow(file)}`, { fileName, nonSchemaFileName });

        for (const [section, folder] of Object.entries(folders)) {
            if (file.contains(`${config.paths.scriptsFolderName}/${folder}/`)) {
                if (sections[section].contains(fileName) || (nonSchemaFileName && sections[section].contains(nonSchemaFileName))) {
                    if (finalDeleteds.contains(file)) {
                        console.warn(`${chalk.yellow("Warning: ")}${fileName} removed from changeset (its file is deleted).\n`)

                        const index = sections[section].findIndex(x => equals(x, fileName) || equals(x, nonSchemaFileName));

                        if (index >= 0) {
                            config.debug3(`\t\tremoved`)

                            sections[section].splice(index, 1);
                        } else {
                            config.debug3(`\t\titem not found!`);
                        }
                    } else {
                        config.debug3(`\t\talready exists`);
                    }
                } else {
                    if (!finalDeleteds.contains(file)) {
                        config.debug3(`\t\tadded`);

                        sections[section].push(fileName);

                        if (config.renamedFiles.find(filePath => {
                            const _fileName = path.basename(filePath);

                            return filePath.contains(folder) && _fileName.contains(fileName);
                        })) {
                            console.warn(`\n${chalk.yellow(`Warning:`)} detected script rename (${chalk.yellow(fileName)}).
    Don't forget to add ${chalk.yellow("DROP statement")} for old script into ${chalk.yellow("Custom-Start")} section of the Changeset to drop the old object.`);
                        }
                    } else {
                        config.debug3(`\t\tskipped (deleted)`);
                    }
                }
            }
        }
    });

    config.debug("\nremoving changeset items that are deleted ...");

    finalDeleteds.forEach(file => {
        let fileName = path.basename(file);
        let dotIndex = fileName.indexOf(".");
        let nonSchemaFileName = fileName.split(".").length > 2 && dotIndex >= 0 ? fileName.substr(dotIndex + 1) : "";

        config.debug3(`\tdeleted file = ${chalk.yellow(file)}`);

        for (const [section, folder] of Object.entries(folders)) {
            if (file.contains(`${config.paths.scriptsFolderName}/${folder}/`)) {
                if (sections[section].contains(fileName) || (nonSchemaFileName && sections[section].contains(nonSchemaFileName))) {
                    if (finalDeleteds.contains(file)) {
                        console.warn(`${chalk.yellow("Warning: ")}${chalk.red(fileName)} ${chalk.yellow(" removed from changeset (its file is deleted).")}\n`);

                        const index = sections[section].findIndex(x => equals(x, fileName) || equals(x, nonSchemaFileName));

                        if (index >= 0) {
                            config.debug3(`\t\tremoved`);

                            sections[section].splice(index, 1);
                        } else {
                            config.debug3(`\t\titem not found!`);
                        }
                    }
                }
            }
        }
    })

    config.debug("\nchecking if items exist ...");

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

            if (!found && !config.renamedFiles.find(filePath => {
                const fileName = path.basename(filePath);

                return filePath.contains(folder) && fileName.contains(item);
            })) {
                config.error = `The source file for changeset item ${chalk.yellow(item)} in ${chalk.yellow(folder)} folder was not found.
\tEither remove ${chalk.yellow(item)} from your changeset or create such a file in your repo.`;

                break
            }
        }

        if (config.error) {
            break;
        }
    }

    config.debug2("\nupdated sections", sections);

    return isNullOrEmpty(config.error);
}

export default updateSections;