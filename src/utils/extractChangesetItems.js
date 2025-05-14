import { isArray, isNullOrEmpty } from "@locustjs/base";
import getSection from "./getSection";
import chalk from "chalk";
import createSectionsStore from "./createSectionsStore";

function extractChangesetItems(config, content) {
    const result = createSectionsStore(false);

    let section = '';
    let i = 0;

    for (let line of content.split("\n")) {
        i++;
        line = line.trim()

        if (isNullOrEmpty(line) && (!section || section == "customStart" || section == "customEnd")) {
            continue;
        }

        if (line.startsWith("##")) {
            const sec = getSection(line);

            if (!sec) {
                // ignore
                continue;
            }

            if (!section) {
                section = sec;
                config.debug3(` detected section ${chalk.yellow(section)}`)
                continue;
            } else if (section == sec) {
                if ((section != "customEnd" && line.contains("end")) || /\(\s*end\s*\)/.test(line)) {
                    section = "";
                } else {
                    throw `unexpected redundant section marker '${sec}' at line ${i}`
                }
            } else {
                config.debug3(` section changed from ${chalk.yellow(section)} to ${chalk.yellow(sec)}`)
                section = sec;
                continue;
            }
        } else if (line.startsWith("#")) {
            // comment line
            continue;
        }

        if (section && line) {
            if (isArray(result[section])) {
                if (!result[section].contains(line)) {
                    config.debug3(`\tItem Added: ${chalk.gray(line)}`);

                    result[section].push(line);
                } else {
                    config.debug3(`\tItem exists: ${chalk.gray(line)}`);
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