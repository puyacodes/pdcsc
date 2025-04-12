import { Exception } from "@locustjs/exception";
import fs from "fs";
import path from "path";
import detectEncoding from "detect-file-encoding-and-language";
import iconv from 'iconv-lite';
import { isArray, isEmpty, isNullOrEmpty, isSomeArray } from "@locustjs/base";
import getAppVersion from "./getAppVersion";
import chalk from "chalk";
import getAllSqlFiles from "./getAllSqlFiles";

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

async function renderChangesetScript(config, changesetPath, changesetName, deleteds, allFiles) {
    let error;
    const sb = {
        schemas: [],
        procedures: [],
        functions: [],
        tables: [],
        relations: [],
        indexes: [],
        types: [],
        views: [],
        triggers: []
    }

    const { objects, customStart, customEnd } = extractObjects(config, changesetPath);

    if (!isArray(deleteds)) {
        deleteds = [];
    }
    
    if (!isArray(allFiles)) {
        allFiles = getAllSqlFiles(config.paths.scriptsPath);
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

                    config.debug2(`${obj.type}: ${obj.name} copied.`);

                    break;
                }
            }
        }

        // TODO: Done
        // check object's file existence and throw error if not found

        if (!found) {
            error = `Render changeset failed: ${chalk.yellow(obj.name)} file not found.`;
        }
    }

    const hasAnything = !isEmpty(customStart) ||
        !isEmpty(customEnd) ||
        isSomeArray(sb.schemas) ||
        isSomeArray(sb.types) ||
        isSomeArray(sb.tables) ||
        isSomeArray(sb.relations) ||
        isSomeArray(sb.functions) ||
        isSomeArray(sb.procedures) ||
        isSomeArray(sb.views) ||
        isSomeArray(sb.indexes) ||
        isSomeArray(sb.triggers);

    const script = `-- ***            Changeset ${changesetName}          ***
-- ===================== Custom-Start (start) ======================
${customStart}
-- ===================== Custom-Start ( end ) ======================

-- ===================== Schemas (start) ======================
${sb.schemas.join("\n")}
-- ===================== Schemas (end) ======================

-- ===================== Types (start) ======================
${sb.types.join("\n")}
-- ===================== Types (end) ======================

-- ===================== Tables (start) ======================
${sb.tables.join("\n")}
-- ===================== Tables (end) ======================

-- ===================== Relations (start) ======================
${sb.relations.join("\n")}
-- ===================== Relations (end) ======================

-- ===================== Functions (start) ======================
${sb.functions.join("\n")}
-- ===================== Functions (end) ======================

-- ===================== Procedures (start) ======================
${sb.procedures.join("\n")}
-- ===================== Procedures (end) ======================

-- ===================== Views (start) ======================
${sb.views.join("\n")}
-- ===================== Views (end) ======================

-- ===================== Indexes (start) ======================
${sb.indexes.join("\n")}
-- ===================== Indexes (end) ======================

-- ===================== Triggers (start) ======================
${sb.triggers.join("\n")}
-- ===================== Triggers (end) ======================

-- ===================== Custom-End (start) ======================
${customEnd}
-- ===================== Custom-End ( end ) ======================

go
${getAppVersion(config)}

go
`;

    return { script, error, hasAnything }
}


export default renderChangesetScript;
