import { Exception } from "@locustjs/exception";
import fs from "fs";
import path from "path";
import detectEncoding from "detect-file-encoding-and-language";
import iconv from 'iconv-lite';
import { isNullOrEmpty } from "@locustjs/base";

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
        throw new Exception(`unsupported encoding ${result} (${info.encoding}) in ${filePath}`);
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
function getAllSqlFiles(dir) {
    let results = [];
    const list = fs.readdirSync(dir);

    list.forEach((file) => {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);

        if (stat && stat.isDirectory()) {
            results = results.concat(getAllSqlFiles(fullPath));
        } else if (fullPath.endsWith(".sql")) {
            results.push(fullPath);
        }
    });

    return results;
}
function extractObjects(config) {
    const objects = [];
    let currentSection = "";
    let customStart = "";
    let customEnd = "";

    const lines = fs.readFileSync(config.changesetTempFilePath, "utf-8").split("\n");

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

    config.debug(`Total objects: ${objects.length}\n`);

    return { objects, customStart, customEnd };
}

async function processChangeset(config) {
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

    const { objects, customStart, customEnd } = extractObjects(config);
    const files = getAllSqlFiles(config.paths.scriptsPath);

    for (const obj of objects) {
        let found = false;

        for (const filePath of files) {
            const fileName = path.basename(filePath);

            if (isNullOrEmpty(config.folders[obj.type])) {
                throw new Exception(`missing script folder for ${obj.type}`)
            }

            // TODO: Done
            // Filepath must be checked - Relation and Table conflict here (same names)
            if (filePath.contains(config.folders[obj.type]) && fileName.contains(obj.name)) {
                // TODO: Done
                // read files based on their encoding
                const content = await readFile(filePath, config.defaultCodePage);

                sb[obj.type].push(content);

                found = true;

                config.debug(`${obj.type}: ${obj.name} copied.`);

                break;
            }
        }

        // TODO: Done
        // check object's file existence and throw error if not found
        if (!found) {
            throw new Exception(`${config.folders[obj.type]}: ${obj.name} file not found!`);
        }
    }

    return `-- ===================== Custom-Start (start) ======================
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

-- ===================== Custom-End (start) ======================
${customEnd}
-- ===================== Custom-End ( end ) ======================
`;
}


export default processChangeset;
