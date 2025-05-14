import { Exception } from "@locustjs/exception";
import fs from "fs";
import path from "path";
import detectEncoding from "detect-file-encoding-and-language";
import iconv from 'iconv-lite';
import { isArray, isEmpty, isNullOrEmpty, isSomeArray, isSomeString, isString } from "@locustjs/base";
import getAppVersion from "./getAppVersion";
import chalk from "chalk";
import getAllSqlFiles from "./getAllSqlFiles";
import extractChangesetItems from "./extractChangesetItems";
import getSectionMarker from "./getSectionMarker";
import createSectionsStore from "./createSectionsStore";
import getChangesetHeader from "./getChangesetHeader";

async function getEncoding(filepath) {
    const info = await detectEncoding(filepath);
    let result = (info.encoding || "").toLowerCase().replace("-", "");

    if (result == "utf8") {
        result = "utf-8";
    }
    if (!result) {
        result = "latin1";
    }
    if (["utf-8", "utf16le", "ascii", "latin1"].indexOf(result) < 0) {
        throw new Exception(`Unsupported encoding ${chalk.yellow(result)} (${info.encoding}) in ${filepath}`);
    }

    return result;
}
async function readFile(filepath, codepage) {
    const encoding = await getEncoding(filepath);

    let content = fs.readFileSync(filepath, encoding);

    if (encoding == "latin1" && codepage) {
        const bytes = fs.readFileSync(filepath, "binary");

        content = iconv.decode(bytes, codepage);
    }

    return content;
}

function extractObjects(config, changesetPath) {
    const content = fs.readFileSync(changesetPath, "utf-8");
    const sections = extractChangesetItems(config, content);
    const { customStart, customEnd } = sections;
    const objects = [];

    config.debug2(`\tSections: `, sections);

    for (let section of Object.keys(sections)) {
        if (isArray(sections[section])) {
            for (let item of sections[section]) {
                objects.push({ type: section, name: item });
            }
        }
    }

    config.debug2(`\tTotal objects: ${objects.length}`);

    return { objects, customStart, customEnd }
}

function extractObjectsOld(config, changesetPath) {
    const objects = [];
    let currentSection = "";
    let customStart = "";
    let customEnd = "";

    const lines = fs.readFileSync(changesetPath, "utf-8").split("\n");

    for (const line of lines) {
        const trimmed = line.trim();

        if (trimmed.startsWith("##")) {
            if (trimmed.containsAny("Procedure", "Sproc")) currentSection = "procedures";
            else if (trimmed.containsAny("Function", "udf")) currentSection = "functions";
            else if (trimmed.contains("Table")) currentSection = "tables";
            else if (trimmed.contains("Type")) currentSection = "types";
            else if (trimmed.contains("Index")) currentSection = "indexes";
            else if (trimmed.contains("Trigger")) currentSection = "triggers";
            else if (trimmed.contains("Relation")) currentSection = "relations";
            else if (trimmed.contains("View")) currentSection = "views";
            else if (trimmed.contains("Schema")) currentSection = "schemas";
            else if (trimmed.contains("Custom-Start")) currentSection = "customStart";
            else if (trimmed.contains("Custom-End")) currentSection = "customEnd";
        } else if (currentSection === "customStart") {
            customStart += `\n${trimmed}`;
        } else if (currentSection === "customEnd") {
            customEnd += `\n${trimmed}`;
        } else if (trimmed && !trimmed.startsWith("##")) {
            if (currentSection) {
                objects.push({ type: currentSection, name: trimmed });
            } else {
                console.warn("\tOrphan line ignored: " + trimmed);
            }
        }
    }

    config.debug2(`Total objects: ${objects.length}`);

    return { objects, customStart, customEnd };
}

function write(config, key, items, minify = false) {
    let result = "";
    const header = `
-- ============ ${getSectionMarker(key)} ============
`;

    if (isString(items)) {
        if (isSomeString(items.trim())) {
            result = header + items.trim();
        }
    } else if (isArray(items)) {
        if (items.length) {
            result = items.join("\n");

            if (config.useMinification && minify) {
                result = config.minifier.minify(result);
            }
            if (config.useUglification) {
                result = config.uglifier.uglify(result);
            }
            if (config.useObfuscation) {
                result = config.obfuscator.obfuscate(result);
            }
        }
    }

    if (result) {
        result = header + result;
    }

    return result;
}

async function renderChangesetScript(config, changesetPath, changesetName, deleteds, allFiles, appendAppVersion = true) {
    let error;
    const sb = createSectionsStore();

    config.debug(`Rendering changeset ${changesetName} ...`)
    config.debug2(`\t${changesetPath}`)

    const { objects, customStart, customEnd } = extractObjects(config, changesetPath);

    config.debug2('extracted objects', objects);

    if (!isArray(deleteds)) {
        deleteds = [];
    }

    if (!isArray(allFiles)) {
        allFiles = getAllSqlFiles(config, config.paths.scriptsPath);
    }

    for (const obj of objects) {
        let found = false;

        if (deleteds.find(filePath => {
            const fileName = path.basename(filePath);

            return filePath.contains(config.folders[obj.type]) && fileName.contains(obj.name);
        })) {
            found = true;
            break;
        } else {
            for (const filePath of allFiles) {
                const fileName = path.basename(filePath);


                if (isNullOrEmpty(config.folders[obj.type])) {
                    throw new Exception(`Missing script folder for ${chalk.yellow(obj.type)}`)
                }

                // TODO: Done
                // Filepath must be checked - Relation and Table conflict here (same names)
                if (filePath.contains(config.folders[obj.type]) && fileName.contains(obj.name)) {
                    // TODO: Done
                    // read files based on their encoding
                    const content = await readFile(filePath, config.defaultCodePage);

                    sb[obj.type].push(content);

                    found = true;

                    config.debug3(`${obj.type}: ${obj.name} copied.`);

                    break;
                }
            }
        }

        // TODO: Done
        // check object's file existence and throw error if not found

        if (!found) {
            error = `Render changeset ${chalk.cyan(changesetName)} failed: ${chalk.yellow(obj.name)} file not found.`;
        }
    }

    sb.customStart = customStart;
    sb.customEnd = customEnd;

    config.debug7({ sb })

    const hasAnything = !isEmpty(sb.customStart) ||
        !isEmpty(sb.customEnd) ||
        isSomeArray(sb.schemas) ||
        isSomeArray(sb.types) ||
        isSomeArray(sb.tables) ||
        isSomeArray(sb.relations) ||
        isSomeArray(sb.functions) ||
        isSomeArray(sb.procedures) ||
        isSomeArray(sb.views) ||
        isSomeArray(sb.indexes) ||
        isSomeArray(sb.sequences) ||
        isSomeArray(sb.queues) ||
        isSomeArray(sb.assemblies) ||
        isSomeArray(sb.synonyms) ||
        isSomeArray(sb.statistics) ||
        isSomeArray(sb.triggers);

    const script = getChangesetHeader(config, true, changesetName) +
        write(config, "customStart", sb.customStart) +
        write(config, "assemblies", sb.assemblies) +
        write(config, "schemas", sb.schemas) +
        write(config, "types", sb.types) +
        write(config, "sequences", sb.sequences) +
        write(config, "tables", sb.tables) +
        write(config, "relations", sb.relations) +
        write(config, "functions", sb.functions) +
        write(config, "synonyms", sb.synonyms) +
        write(config, "procedures", sb.procedures) +
        write(config, "queues", sb.queues) +
        write(config, "views", sb.views) +
        write(config, "indexes", sb.indexes) +
        write(config, "triggers", sb.triggers) +
        write(config, "statistics", sb.statistics) +
        write(config, "customEnd", sb.customEnd) +
        (appendAppVersion ? getAppVersion(config, changesetName) : '');

    return { script, error, hasAnything }
}


export default renderChangesetScript;
