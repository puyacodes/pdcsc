import chalk from "chalk";
import fs from "fs";
import commitChanges from "../../utils/commitChanges";
import { isArray, isEmpty, isNullOrEmpty, isSomeArray, isSomeString, isString } from "@locustjs/base";
import getSection from "../../utils/getSection";
import createSectionsStore from "../../utils/createSectionsStore";
import getChangesetHeader from "../../utils/getChangesetHeader";
import getSectionHeader from "../../utils/getSectionHeader";
import getOrderedSections from "../../utils/getOrderedSections";
import hasChangesetHeader from "../../utils/hasChangesetHeader";
import { isCustomEndSection, isCustomStartSection, isSectionEnd } from "../../utils/isCustomSection";
import { Exception } from "@locustjs/exception";

function finalizeContent(config, content, sections, dropStatements) {
    let newContent = false;
    let customEndHeader;
    const result = [];
    const customEnd = [];

    // since end section is an especial section which should
    // be put at the end, we append the lines of this section
    // to a distinct array 'customEnd' instead of the normal 'result' array

    const draft = createSectionsStore(true);

    if (config.fullChangeset) {
        draft.header = []
    }

    if (!isEmpty(content) && content.split("\n").filter(line => line.trim().startsWith("##")).length > 0) {
        let section = '';
        let isInHeader = true;
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

                            if (config.fullChangeset) {
                                if (!isArray(draft[section])) {
                                    throw new Exception(`missing array in ${section} section`)
                                }

                                draft[section].push(item)
                            } else {
                                result.push(item);
                            }
                        }
                    }
                } else if (isCustomStartSection(section) && dropStatements && !dropsAdded) {
                    config.debug3(`\t\tsection ${chalk.yellow(section)}: adding drop statements`)

                    if (config.fullChangeset) {
                        draft.customStart.push(dropStatements)
                    } else {
                        result.push(dropStatements);
                    }

                    dropsAdded = true;
                }
            }
        }

        for (let line of content.split("\n")) {
            const trimmedLine = line.trim()

            if (isNullOrEmpty(trimmedLine)) {
                if (config.fullChangeset) {
                    if (section) {
                        draft[section].push(line);
                    } else if (isInHeader) {
                        draft.header.push(line);
                    } else {
                        // empty lines between sections are ignored
                    }
                } else {
                    if (isCustomEndSection(section)) {
                        customEnd.push(line);
                    } else {
                        result.push(line);
                    }
                }

                continue;
            }

            if (trimmedLine.startsWith("##")) {
                const sec = getSection(trimmedLine);

                if (sec) {
                    if (isCustomEndSection(sec)) {
                        customEndHeader = line
                    }

                    isInHeader = false;

                    if (!section) {
                        section = sec;

                        config.debug3(`\tdetected section ${chalk.yellow(section)}`)
                    } else if (section == sec) {
                        if (isSectionEnd(section, trimmedLine)) {
                            config.debug3(`\tsection ${chalk.yellow(section)} ended`)
    
                            addNewItems();
    
                            section = "";
                        }
                    } else {
                        addNewItems();

                        config.debug3(`\tsection changed from ${chalk.yellow(section)} to ${chalk.yellow(sec)}`)

                        section = sec;
                    }

                    if (config.fullChangeset) {
                        draft[sec].push(line);
                    } else {
                        if (!isCustomEndSection(sec)) {
                            result.push(line);
                        }
                    }
                } else {
                    config.debug3(`\tskipped unknown section ${chalk.red(trimmedLine)}`)
                }

                if (!config.fullChangeset && isArray(draft[section]) && !draft[section].length) {
                    draft[section].push(true);
                }

                continue;
            } else if (trimmedLine.startsWith("#")) {
                if (config.fullChangeset) {
                    if (section) {
                        draft[section].push(line);
                    } else if (isInHeader) {
                        draft.header.push(line);
                    } else {
                        // comment lines between sections are ignored
                    }
                } else {
                    if (isCustomEndSection(section)) {
                        customEnd.push(line);
                    } else {
                        result.push(line);
                    }
                }

                continue;
            }

            if (section) {
                if (isArray(sections[section])) {
                    if (sections[section].contains(trimmedLine)) {
                        if (!temp[section].contains(trimmedLine)) {
                            if (config.fullChangeset) {
                                draft[section].push(line);
                            } else {
                                result.push(line);
                            }

                            temp[section].push(trimmedLine);
                        } else {
                            config.debug3(`\t\t${trimmedLine}: already exists`)
                        }
                    } else {
                        config.debug3(`\t\t${trimmedLine}: removed`)
                    }
                } else {
                    if (config.fullChangeset) {
                        draft[section].push(line);
                    } else {
                        if (isCustomEndSection(section)) {
                            customEnd.push(line);
                        } else {
                            result.push(line);
                        }
                    }
                }
            }
        }

        if (section) {
            addNewItems();
        }
    } else {
        if (!hasChangesetHeader(content)) {
            result.push(getChangesetHeader(config))
        }

        if (!isEmpty(content)) {
            result.push(content);
        }

        if (!config.fullChangeset) {
            result.push(getSectionHeader("customStart") + "\n")
        }

        newContent = true;
    }

    if (config.fullChangeset) {
        Object.keys(draft)
            .filter(section => section != "header" && !isSomeArray(draft[section]))
            .forEach(section => draft[section].push(getSectionHeader(section, isCustomEndSection(section) ? customEndHeader : "") + "\n"));

        if (isSomeArray(draft.header)) {
            result.push(...draft.header)
        }

        if (dropStatements && !dropsAdded) {
            draft.customStart.push(dropStatements);
        }

        getOrderedSections()
            .forEach(section => result.push(...draft[section]))
    } else {
        getOrderedSections()
            .filter(section => !isSomeArray(draft[section]))
            .forEach((section) => {
                const items = sections[section];

                config.debug3(`${section}`, items)

                const header = getSectionHeader(section, isCustomEndSection(section) ? customEndHeader : "");

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
            result.push(getSectionHeader("customEnd", customEndHeader));
            result.push(customEnd.join("\n").trim())
        }
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
        config.error = new Exception('finalizing changeset failed', ex);
    }

    return isNullOrEmpty(config.error);
};

export default finalizeChangeset;