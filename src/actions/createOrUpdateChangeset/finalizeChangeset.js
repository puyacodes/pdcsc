import chalk from "chalk";
import fs from "fs";
import commitChanges from "../../utils/commitChanges";
import { isArray, isEmpty, isNullOrEmpty, isSomeArray, isSomeString, isString } from "@locustjs/base";
import getSection from "../../utils/getSection";
import getSectionMarker from "../../utils/getSectionMarker";
import createSectionsStore from "../../utils/createSectionsStore";
import getChangesetHeader from "../../utils/getChangesetHeader";

function finalizeContent(config, content, sections, dropStatements) {
    const result = [];
    const customEnd = [];
    const draft = createSectionsStore(true);
    let newContent = false;

    if (!isEmpty(content) && content.split("\n").filter(line => line.trim().startsWith("##")).length > 0) {
        let section = '';
        let dropsAdded = false;
        const temp = createSectionsStore(true);

        function addNewItems() {
            if (section) {
                if (isArray(sections[section])) {
                    config.debug3(`\tsection ${chalk.yellow(section)}: adding missing items if not already added`)

                    for (let item of sections[section]) {
                        if (!temp[section].contains(item)) {
                            config.debug3(`\t\tadded ${item}`)

                            temp[section].push(item);
                            result.push(item);
                        }
                    }
                } else if (section == "customStart" && dropStatements && !dropsAdded) {
                    config.debug3(` section ${chalk.yellow(section)}: adding drop statements`)

                    result.push(dropStatements);

                    dropsAdded = true;
                }
            }
        }

        for (let line of content.split("\n")) {
            const trimmedLine = line.trim()

            if (isNullOrEmpty(trimmedLine)) {
                if (section == "customEnd") {
                    customEnd.push(line);
                } else {
                    result.push(line);
                }

                continue;
            }

            if (trimmedLine.startsWith("##")) {
                const sec = getSection(trimmedLine);

                if (sec) {
                    if (!section) {
                        section = sec;

                        config.debug3(`\tdetected section ${chalk.yellow(section)}`)
                    } else if (section == sec) {
                        if ((section != "customEnd" && trimmedLine.contains("end")) || /\(\s*end\s*\)/.test(line)) {
                            addNewItems();

                            section = "";
                        }
                    } else {
                        addNewItems();

                        config.debug3(`\tsection changed from ${chalk.yellow(section)} to ${chalk.yellow(sec)}`)

                        section = sec;
                    }
                }

                if (sec != "customEnd") {
                    result.push(line);
                }

                continue;
            } else if (trimmedLine.startsWith("#")) {
                if (section == "customEnd") {
                    customEnd.push(line);
                } else {
                    result.push(line);
                }

                continue;
            }

            if (section) {
                if (!isSomeArray(draft[section])) {
                    draft[section].push(true);
                }

                if (isArray(sections[section])) {
                    if (sections[section].contains(trimmedLine)) {
                        if (!temp[section].contains(trimmedLine)) {
                            result.push(line);
                            temp[section].push(trimmedLine);
                        } else {
                            config.debug3(`\t\t${trimmedLine}: already exists`)
                        }
                    } else {
                        config.debug3(`\t\t${trimmedLine}: removed`)
                    }
                } else {
                    if (section == "customEnd") {
                        customEnd.push(line);
                    } else {
                        result.push(line);
                    }
                }
            }
        }

        if (section) {
            addNewItems();
        }
    } else {
        result.push(getChangesetHeader(config, false))
        result.push(`## ===================== Custom-Start =====================
`)
        newContent = true;
    }

    Object.keys(sections)
        .filter(section => !isSomeArray(draft[section]))
        .forEach((section) => {
            const items = sections[section];
            const header = `## ============ ${getSectionMarker(section)} ============`;

            if (isString(items)) {
                if (isSomeString(items.trim())) {
                    result.push(header);
                    result.push(items.trim());
                }
            } else if (isSomeArray(items)) {
                result.push(header);
                result.push(items.join("\n"));
            }
        });

    if (newContent || isSomeArray(customEnd)) {
        result.push(`## ===================== Custom-End =====================
${customEnd.join("\n").trim()}
`);
    }

    return result.join("\n");
}

function createNewTemplateOld(config, content, sections, dropStatements) {
    return `
## ===================== Custom-Start (start) ======================
${sections.customStart}
${(dropStatements || "")}
## ===================== Custom-Start ( end ) ======================

## ===================== Schemas (start) ======================
${sections.schemas.join("\n")}
## ===================== Schemas ( end ) ======================

## ===================== Types (start) ======================
${sections.types.join("\n")}
## ===================== Types ( end ) ======================

## ===================== Tables (start) ======================
${sections.tables.join("\n")}
## ===================== Tables ( end ) ======================

## ===================== Relations (start) ======================
${sections.relations.join("\n")}
## ===================== Relations ( end ) ======================

## ===================== Functions (start) ======================
${sections.functions.join("\n")}
## ===================== Functions ( end ) ======================

## ===================== Procedures (start) ======================
${sections.procedures.join("\n")}
## ===================== Procedures ( end ) ======================

## ===================== Views (start) ======================
${sections.views.join("\n")}
## ===================== Views ( end ) ======================

## ===================== Indexes (start) ======================
${sections.indexes.join("\n")}
## ===================== Indexes ( end ) ======================

## ===================== Triggers (start) ======================
${sections.triggers.join("\n")}
## ===================== Triggers ( end ) ======================

## ===================== Custom-End (start) ======================
${sections.customEnd}
## ===================== Custom-End ( end ) ======================
    `
}
async function finalizeChangeset(config) {
    const {
        sections,
        dropStatements,
        finalChangeset,
        finalChangesetName,
        finalChangesetFilePath,
        isNewChangeset
    } = config;

    try {
        const oldContent = fs.readFileSync(finalChangesetFilePath, "utf-8");

        config.debug("Finalizing changeset ...");

        const content = finalizeContent(config, oldContent, sections, dropStatements);

        fs.writeFileSync(finalChangesetFilePath, content, "utf-8");

        config.debug(`changeset ${chalk.gray(finalChangesetName)} template saved`);

        const changes = [finalChangesetFilePath];

        config.error = await commitChanges(changes, `changeset ${finalChangeset}: template ${isNewChangeset ? "created" : `updated`}.`);

        if (!config.error) {
            config.changesetChanged = true;
        }
    } catch (ex) {
        config.error = ex;
    }

    return isNullOrEmpty(config.error);
};

export default finalizeChangeset;