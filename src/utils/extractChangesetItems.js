import { isArray, isNullOrEmpty } from "@locustjs/base";
import getSection from "./getSection";
import chalk from "chalk";
import createSectionsStore from "./createSectionsStore";
import { isCustomSection, isSectionEnd } from "./isCustomSection";

function extractChangesetItems(config, content) {
    const result = createSectionsStore(false);

    let section = '';
    let i = 0;

    for (let line of content.split("\n")) {
        i++;
        const trimmedLine = line.trim();

        if (isNullOrEmpty(trimmedLine) && (!section || isCustomSection(section))) {
            continue;
        }

        if (trimmedLine.startsWith("##")) {
            const sec = getSection(trimmedLine);

            if (!sec) {
                // ignore
                continue;
            }

            if (!section) {
                section = sec;
                config.debug3(` detected section ${chalk.yellow(section)}`)
                continue;
            } else if (section == sec) {
                if (isSectionEnd(section, trimmedLine)) {
                    section = "";
                } else {
                    throw `unexpected redundant section marker '${sec}' at line ${i}`
                }
            } else {
                config.debug3(` section changed from ${chalk.yellow(section)} to ${chalk.yellow(sec)}`)
                section = sec;
                continue;
            }
        } else if (trimmedLine.startsWith("#")) {
            // comment line
            continue;
        }

        if (section && trimmedLine) {
            if (isArray(result[section])) {
                if (!result[section].contains(trimmedLine)) {
                    config.debug3(`\tItem Added: ${chalk.gray(trimmedLine)}`);

                    result[section].push(trimmedLine);
                } else {
                    config.debug3(`\tItem exists: ${chalk.gray(trimmedLine)}`);
                }
            } else {
                result[section] = result[section] ? (result[section] + "\n" + line) : line;
            }
        }
    }

    result.customStart = result.customStart.trim();
    result.customEnd = result.customEnd.trim();

    return result;
}

export default extractChangesetItems;