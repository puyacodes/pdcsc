const { isNullOrEmpty, isNullOrUndefined, isSomeString, isArray, isString, isEmpty, isSomeArray } = require("@locustjs/base");
const fs = require("fs");
const path = require("path");
const chalk = require("chalk");

function equals(str1, str2, ignoreCase = true) {
    let result = false;

    if (isString(str1) && isString(str2)) {
        result = ignoreCase ? str1.toLowerCase() == str2.toLowerCase() : str1 == str2;
    } else {
        result = isNullOrEmpty(str1) && isNullOrEmpty(str2);
    }

    return result;
}

if (String.prototype.equals === undefined) {
    String.prototype.equals = function (...args) {
        return equals(this, ...args);
    }
}

function containsAll(str, ...args) {
    let result = false;

    if (isSomeString(str)) {
        if (args.length) {
            result = true;

            const _str = str.toLowerCase();

            for (let arg of args) {
                const value = isNullOrUndefined(arg) ? "" : arg.toString().toLowerCase();

                if (!_str.includes(value)) {
                    result = false;
                    break;
                }
            }
        } else {
            result = true;
        }
    }

    return result;
}

function containsAny(str, ...args) {
    let result = true;

    if (isSomeString(str) && args.length) {
        result = false;

        const _str = str.toLowerCase();

        for (let arg of args) {
            const value = isNullOrUndefined(arg) ? "" : arg.toString().toLowerCase();

            if (_str.includes(value)) {
                result = true;
                break;
            }
        }
    }

    return result;
}

// --------------------------------------------
//              String extensions
// --------------------------------------------

if (String.prototype.contains === undefined) {
    String.prototype.contains = function (...args) {
        return containsAll(this, ...args);
    }
}

if (String.prototype.containsAll === undefined) {
    String.prototype.containsAll = function (...args) {
        return containsAll(this, ...args);
    }
}

if (String.prototype.containsAny === undefined) {
    String.prototype.containsAny = function (...args) {
        return containsAny(this, ...args);
    }
}

if (Array.prototype.contains === undefined) {
    Array.prototype.contains = function (arg) {
        let result = false;

        for (let item of this) {
            if ((item || "").toString().equals(arg)) {
                result = true;
                break;
            }
        }

        return result;
    }
}

function getSection(line) {
    let result;

    if (line.startsWith('##')) {
        if (line.contains("Custom-Start")) {
            result = "customStart";
        } else if (line.containsAny("Custom-Start", "CustomStart")) {
            result = "customStart";
        } else if (line.containsAny("Custom-End", "CustomEnd")) {
            result = "customEnd";
        } else if (line.contains("Schema")) {
            result = "schemas";
        } else if (line.contains("Type")) {
            result = "types";
        } else if (line.contains("Table")) {
            result = "tables";
        } else if (line.contains("Relation")) {
            result = "relations";
        } else if (line.containsAny("Function", "Udf")) {
            result = "functions";
        } else if (line.containsAny("Procedure", "SPROC")) {
            result = "procedures";
        } else if (line.contains("View")) {
            result = "views";
        } else if (line.contains("Index")) {
            result = "indexes";
        } else if (line.contains("Trigger")) {
            result = "triggers";
        } else if (line.contains("Sequence")) {
            result = "sequences";
        } else if (line.contains("Synonym")) {
            result = "synonyms";
        } else if (line.contains("Statistics")) {
            result = "statistics";
        } else if (line.containsAny("Queue", "ServiceQueue", "Service Queue")) {
            result = "queues";
        } else if (line.containsAny("Assembly", "Assemblies")) {
            result = "assemblies";
        }
    }

    return result;
}

function extractSections(content) {
    const result = {
        customStart: "",
        procedures: [],
        functions: [],
        tables: [],
        relations: [],
        types: [],
        views: [],
        indexes: [],
        triggers: [],
        schemas: [],
        sequences: [],
        synonyms: [],
        queues: [],
        assemblies: [],
        statistics: [],
        customEnd: ""
    };

    let section = '';
    let i = 0;

    for (let line of content.split("\n")) {
        i++;
        line = line.trim()

        if (isNullOrEmpty(line) && (!section || isArray(result[section]))) {
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
                console.log(` detected section ${chalk.yellow(section)}`)
                continue;
            } else if (section == sec) {
                if (line.contains("end")) {
                    section = "";
                } else {
                    throw `unexpected redundant section marker '${sec}' at line ${i}`
                }
            } else {
                console.log(` section changed from ${chalk.yellow(section)} to ${chalk.yellow(sec)}`)
                section = sec;
                continue;
                //throw `section conflict: unexpected section '${sec}' inside '${section}' at line ${i}`
            }
        }

        if (section) {
            if (isArray(result[section])) {
                if (!result[section].contains(line)) {
                    console.log(`\tItem Added: ${chalk.gray(line)}`);

                    result[section].push(line);
                } else {
                    console.log(`\tItem exists: ${chalk.gray(line)}`);
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

function createNewTemplate(config, content, sections, dropStatements) {
    const result = [];
    let section = '';
    const temp = {
        customStart: [],
        procedures: [],
        functions: [],
        tables: [],
        relations: [],
        types: [],
        views: [],
        indexes: [],
        triggers: [],
        schemas: [],
        customEnd: [],
        sequences: [],
        synonyms: [],
        queues: [],
        assemblies: [],
        statistics: []
    };

    function addNewItems() {
        if (section) {
            if (isArray(sections[section])) {
                for (let item of sections[section]) {
                    if (!temp[section].contains(item)) {
                        temp[section].push(item);
                        result.push(item);
                    }
                }
            } else if (section == "customStart" && dropStatements) {
                result.push(dropStatements);
            }
        }
    }

    for (let line of content.split("\n")) {
        const trimmedLine = line.trim()

        if (isNullOrEmpty(trimmedLine)) {
            result.push(line);

            continue;
        }

        if (trimmedLine.startsWith("##")) {
            const sec = getSection(trimmedLine);

            if (sec) {
                if (!section) {
                    section = sec;
                } else if (section == sec) {
                    if ((section != "customEnd" && trimmedLine.contains("end")) || /\(\s*end\s*\)/.test(line)) {
                        addNewItems();

                        section = "";
                    }
                } else {
                    addNewItems();

                    section = sec;
                }
            }

            result.push(line);

            continue;
        }

        if (section) {
            if (isArray(sections[section])) {
                if (sections[section].contains(trimmedLine) && !temp[section].contains(trimmedLine)) {
                    result.push(line);
                    temp[section].push(trimmedLine);
                }
            } else {
                result.push(line);
            }
        }
    }

    if (section) {
        addNewItems();
    }

    return result.join("\n");
}

const content = fs.readFileSync(path.join(__dirname, "chanegset-1404.txt"), "utf-8");

const x = extractSections(content);

console.log(x)
x.procedures.splice(1, 1);

const newChangeset = createNewTemplate({}, content, x, "drop table aa\ndrop proc bb;");

fs.writeFileSync(path.join(__dirname, "chanegset-1404-1.txt"), newChangeset, "utf-8");