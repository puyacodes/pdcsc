const fs = require("fs");
const path = require("path");

class DbObject {
    constructor(name, type) {
        this.name = name;
        this.type = type;
    }
}

function prepareDir(dir) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    } else {
        fs.readdirSync(dir).forEach((file) => {
            fs.unlinkSync(path.join(dir, file));
        });
    }
}

// تابع بازگشتی برای خواندن فایل‌های SQL
function getAllSqlFiles(dir) {
    let results = [];
    const list = fs.readdirSync(dir);

    list.forEach((file) => {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);

        if (stat && stat.isDirectory()) {
            results = results.concat(getAllSqlFiles(fullPath)); // بازگشتی
        } else if (fullPath.endsWith(".sql")) {
            results.push(fullPath);
        }
    });

    return results;
}

function scriptCopier(changeFile, dir, debug) {
    const sbProcedures = [];
    const sbFunctions = [];
    const sbTables = [];
    const sbRelations = [];
    const sbIndexes = [];
    const sbTypes = [];
    const sbViews = [];
    const sbTriggers = [];
    let customStart = "";
    let customEnd = "";

    let currentSection = "";
    const objects = [];

    const lines = fs.readFileSync(changeFile, "utf-8").split("\n");

    for (const line of lines) {
        const trimmed = line.trim();

        if (trimmed.startsWith("--")) {
            if (trimmed.includes("Procedure") || trimmed.includes("SPROCs")) currentSection = "procedure";
            else if (trimmed.includes("Function")) currentSection = "function";
            else if (trimmed.includes("Tables")) currentSection = "table";
            else if (trimmed.includes("Types")) currentSection = "type";
            else if (trimmed.includes("Index")) currentSection = "index";
            else if (trimmed.includes("Trigger")) currentSection = "trigger";
            else if (trimmed.includes("Relation")) currentSection = "relation";
            else if (trimmed.includes("View")) currentSection = "view";
            else if (trimmed.includes("Custom-Start")) currentSection = "customStart";
            else if (trimmed.includes("Custom-End")) currentSection = "customEnd";
        } else if (currentSection === "customStart") {
            customStart += `\n${trimmed}`;
        } else if (currentSection === "customEnd") {
            customEnd += `\n${trimmed}`;
        } else if (trimmed && !trimmed.startsWith("--")) {
            objects.push(new DbObject(trimmed, currentSection));
        }
    }

    if (debug) {
        console.log(`Total objects: ${objects.length}\n`);
    }

    const files = getAllSqlFiles(dir);

    for (const obj of objects) {
        let found = false;

        for (const filePath of files) {
            const fileName = path.basename(filePath); // فقط نام فایل

            if (fileName.includes(obj.name)) {
                const content = fs.readFileSync(filePath, "utf-8");

                switch (obj.type) {
                    case "procedure":
                        sbProcedures.push(content);
                        break;
                    case "function":
                        sbFunctions.push(content);
                        break;
                    case "table":
                        sbTables.push(content);
                        break;
                    case "relation":
                        sbRelations.push(content);
                        break;
                    case "index":
                        sbIndexes.push(content);
                        break;
                    case "type":
                        sbTypes.push(content);
                        break;
                    case "view":
                        sbViews.push(content);
                        break;
                    case "trigger":
                        sbTriggers.push(content);
                        break;
                }

                found = true;
                if (debug) {
                    console.log(`${obj.type}: ${obj.name} copied.`);
                }
                break;
            }
        }

        if (!found) {
            if (debug) {
                console.log(`${obj.type}: ${obj.name} not found!`);
            }
        }
    }

    return `
-- ===================== Custom-Start (start) ======================
${customStart}
-- ===================== Custom-Start ( end ) ======================

-- ===================== Types (start) ======================
${sbTypes.join("\n")}
-- ===================== Types (end) ======================

-- ===================== Tables (start) ======================
${sbTables.join("\n")}
-- ===================== Tables (end) ======================

-- ===================== Relations (start) ======================
${sbRelations.join("\n")}
-- ===================== Relations (end) ======================

-- ===================== Functions (start) ======================
${sbFunctions.join("\n")}
-- ===================== Functions (end) ======================

-- ===================== SPROCs (start) ======================
${sbProcedures.join("\n")}
-- ===================== SPROCs (end) ======================

-- ===================== Custom-End (start) ======================
${customEnd}
-- ===================== Custom-End ( end ) ======================
    `;
}


function changes(config, tempFileName) {
    const changeFile = path.join(config.basePath, config.paths.changesetFolderName, `${tempFileName}.txt`);
    const scriptDir = path.join(config.basePath, config.paths.scriptsFolderName);

    const result = scriptCopier(changeFile, scriptDir, config.options.debugMode);

    return result;
}

function processChangeset(props) {
    return changes(props.config, props.tempFileName);
}

module.exports = { processChangeset };
