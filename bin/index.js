#!/usr/bin/env node
'use strict';

var chalk = require('chalk');
var base = require('@locustjs/base');
var semver = require('semver');
var child_process = require('child_process');
var exception = require('@locustjs/exception');
var _enum = require('@locustjs/enum');
var fs = require('fs');
var path = require('path');
var simpleGit = require('simple-git');
var readline = require('readline');
var detectEncoding = require('detect-file-encoding-and-language');
var iconv = require('iconv-lite');
var ts = require('@puya/ts');
var moment = require('jalali-moment');
var sql = require('mssql');
var extensionsObject = require('@locustjs/extensions-object');

function containsAll(str, ...args) {
    let result = false;

    if (base.isSomeString(str)) {
        if (args.length) {
            result = true;

            const _str = str.toLowerCase();

            for (let arg of args) {
                const value = base.isNullOrUndefined(arg) ? "" : arg.toString().toLowerCase();

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

    if (base.isSomeString(str) && args.length) {
        result = false;

        const _str = str.toLowerCase();

        for (let arg of args) {
            const value = base.isNullOrUndefined(arg) ? "" : arg.toString().toLowerCase();

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
    };
}

if (String.prototype.containsAll === undefined) {
    String.prototype.containsAll = function (...args) {
        return containsAll(this, ...args);
    };
}

if (String.prototype.containsAny === undefined) {
    String.prototype.containsAny = function (...args) {
        return containsAny(this, ...args);
    };
}

// --------------------------------------------
//              Array extensions
// --------------------------------------------

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
    };
}

function equals(str1, str2, ignoreCase = true) {
    let result = false;

    if (base.isString(str1) && base.isString(str2)) {
        result = ignoreCase ? str1.toLowerCase() == str2.toLowerCase(): str1 == str2;
    } else {
        result = base.isNullOrEmpty(str1) && base.isNullOrEmpty(str2);
    }

    return result;
}

if (String.prototype.equals === undefined) {
    String.prototype.equals = function (...args) {
        return equals(this, ...args);
    };
}

var name = "@puya/pdcsc";
var version = "2.4.2";

function checkForUpdate(config) {
    let error;

    try {
        console.log("Checking for pdcsc update ...\n");

        const cmd = `npm view ${name} version`;

        config.debug4("update command:", cmd);

        const latest = child_process.execSync(cmd, { encoding: "utf8" }).trim();

        if (semver.gt(latest, version)) {
            console.warn(`⚠️  Update available: ${chalk.yellow(latest)}`);
            console.log(`Run ${chalk.yellow(`npm update ${name}`)} to update.`);
        } else {
            console.log(`pdcsc is up-to-date.`);
        }
    } catch (ex) {
        error = new exception.Exception(`Failed to check for updates`, ex);
    }

    return error;
}

const ActionType = _enum.Enum.define({
    init: 0,
    roll: 1,
    pipeline: 2,
    apply: 3,
    render: 4,
    checkUpdate: 5,
    createJournalTable: 6
}, 'ActionType');

const ApplyMode = _enum.Enum.define({
    TestAndUpdate: 0,
    Test: 1,
    Update: 2
}, 'ApplyMode');

let ExecuteQueryException$1 = class ExecuteQueryException extends exception.Exception {
    constructor(query, ...args) {
        super(...args);

        this.query = query;
    }
};

function createErrorLog(config, ex) {
    const { paths } = config;
    const { changesetsPath } = paths;
    let query;
    let error;

    if (ex instanceof ExecuteQueryException$1) {
        query = ex.query;
        ex.query = null;
    }

    const logFile = path.join(changesetsPath, "error.log");

    error = new exception.Exception(`Error during script execution. see '${logFile}' for more details.`, ex);

    try {
        fs.writeFileSync(logFile, "", "utf-8");

        try {
            fs.appendFileSync(logFile, JSON.stringify(ex, null, 4) + "\n\n", "utf-8");
        } catch (e) {
            let msg = e.message || e;

            fs.appendFileSync(logFile, msg + "\n\n", "utf-8");

            msg = ex.message || ex;

            fs.appendFileSync(logFile, msg + "\n\n", "utf-8");
        }

        if (query) {
            fs.appendFileSync(logFile, query + "\n\n", "utf-8");
        }

        config.debug5(`\n${query}\n`);
    } catch (ex) {
        console.error(`Error creating log file`, ex);
    }

    return error;
}

async function backupMasterDatabase(config) {
    const { database, db, paths } = config;
    const { backupFile } = paths;
    const dbName = database.database;

    config.debug("Creating database backup...");

    const query = `BACKUP DATABASE [${dbName}] TO DISK = '${backupFile}' WITH INIT`;

    config.debug4(query);

    await db.executeQuery({ query });

    config.debug(`Database backup created: ${chalk.cyan(backupFile)}`);
}

async function dropTempDb(config) {
    const { db, backupDbName } = config;
    let error;

    try {
        config.debug(`Dropping temporary database ...`);
        
        const query = `IF EXISTS(SELECT name FROM sys.databases WHERE name = '${backupDbName}')
            DROP DATABASE[${backupDbName}]`;

        config.debug4(query);

        await db.executeQuery({ query });

        config.debug(`Temporary database dropped successfully.`);
    } catch (ex) {
        config.debug(`Dropping temporary database failed.\n\t${ex.toString()}`);

        error = ex;
    }

    return error;
}

async function executeScript(config, script) {
    const { db, backupDbName } = config;

    config.debug("Executing script on temporary database ...");

    await db.executeBatch({ content: script, dbName: backupDbName });

    config.debug(`Script executed successfully.`);
}

async function getFileGroups(config) {
    try {
        const query = `
            SELECT
                db.name AS dbName,
                type_desc AS fileType,
                Physical_Name AS location,
                mf.Name AS name
            FROM
                sys.master_files mf
            INNER JOIN 
                sys.databases db ON db.database_id = mf.database_id
            WHERE db.name = '${config.database.database}'
        `;
        config.debug4(query);
        
        const result = await config.db.executeQuery({ query });

        return result;
    } catch (ex) {
        throw new exception.Exception(`Error fetching database FileGroups`, ex);
    }
}

async function generateRestoreCommand(config) {
    const { backupDbName } = config;

    try {
        const fileGroups = await getFileGroups(config);
        const moveClauses = fileGroups.map(file => {
            const newFileName = `${config.paths.backupDir}${backupDbName}_${file.location.split("\\").pop()}`;
            
            return `MOVE '${file.name}' TO '${newFileName}'`;
        });

        const moveString = moveClauses.join(", ");

        const restoreCommand = `
use master;

RESTORE DATABASE [${backupDbName}] FROM DISK='${config.paths.backupFile}' WITH File = 1, ${moveString};`;

        return restoreCommand;
    } catch (ex) {
        throw new exception.Exception(`Error generating restore command`, ex);
    }
}

async function restoreTempDatabase(config) {
    const { db, backupDbName } = config;

    config.debug("Restoring backup to temporary database...");

    const query = await generateRestoreCommand(config);

    config.debug4(query);

    await db.executeQuery({ query });

    config.debug(`Backup restored: ${chalk.cyan(backupDbName)}`);
}

async function testScript(config, script) {
    let error;

    try {
        await backupMasterDatabase(config);
        await restoreTempDatabase(config);
        await executeScript(config, script);
    } catch (ex) {
        error = createErrorLog(config, ex);
    } finally {
        await dropTempDb(config);
    }

    if (error) {
        config.debug(chalk.red("Testing script Failed"));
    } else {
        config.debug(chalk.green("Testing script Passed"));
    }

    return error;
}

async function commitChanges(files, message) {
    let error;
    const git = simpleGit();

    try {
        for (let file of files) {
            await git.add(file);
        }

        await git.commit(message);
    } catch (ex) {
        error = ex;
    }

    return error;
}

async function testAndCommitChangeset(config) {
    const {
        scriptFilePath,
        finalChangeset,
        isNewChangeset,
        finalScript
    } = config;
    const tempScriptContent = fs.readFileSync(scriptFilePath, "utf-8");

    console.log("Testing changeset ...");

    // Todo: Done
    // skip test and commit if changeset has no new changes

    config.debug2(`hasChanges: ${config.hasChanges}, hasAnything: ${config.hasAnything}`);

    if (config.hasChanges) {
        if (config.hasAnything) {
            config.error = await testScript(config, tempScriptContent);
        } else {
            console.log(`No changes detected. Testing changeset skipped.`);
        }
    } else {
        console.log("Skipped changeset testing. No new changes detected.");
    }

    if (config.error) {
        console.log(`See 'error.log' for more details`);
    } else {
        if (config.hasChanges && config.hasAnything) {
            console.log(chalk.green("Passed.\n"));
        }

        try {
            fs.writeFileSync(scriptFilePath, finalScript, "utf-8");

            config.error = await commitChanges([scriptFilePath], `pdcsc: changeset ${finalChangeset} ${isNewChangeset ? "created" : `updated`}.`);

            if (!config.error) {
                config.changesetCommitted = true;
            }
        } catch (ex) {
            config.error = new exception.Exception('error happened while finalizing changeset.', ex);
        }
    }

    return base.isNullOrEmpty(config.error);
}

function getSection(line) {
    let result;

    if (line.startsWith('##')) {
        if (line.containsAny("Custom-Start", "CustomStart")) {
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

function createSectionsStore(allArray) {
    const result = {
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
    };

    if (base.isBool(allArray)) {
        if (allArray) {
            result.customStart = [];
            result.customEnd = [];
        } else {
            result.customStart = "";
            result.customEnd = "";
        }
    }

    return result;
}

function isCustomEndSection(section) {
    return section == "customEnd";
}

function isCustomStartSection(section) {
    return section == "customStart";
}

function isCustomSection(section) {
    return isCustomStartSection(section) || isCustomEndSection(section);
}

function extractChangesetItems(config, content) {
    const result = createSectionsStore(false);

    let section = '';
    let i = 0;

    for (let line of content.split("\n")) {
        i++;
        line = line.trim();

        if (base.isNullOrEmpty(line) && (!section || isCustomSection(section))) {
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
                config.debug3(` detected section ${chalk.yellow(section)}`);
                continue;
            } else if (section == sec) {
                if ((section != "customEnd" && line.contains("end")) || /\(\s*end\s*\)/.test(line)) {
                    section = "";
                } else {
                    throw `unexpected redundant section marker '${sec}' at line ${i}`
                }
            } else {
                config.debug3(` section changed from ${chalk.yellow(section)} to ${chalk.yellow(sec)}`);
                section = sec;
                continue;
            }
        } else if (line.startsWith("#")) {
            // comment line
            continue;
        }

        if (section && line) {
            if (base.isArray(result[section])) {
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

function extractSections(config) {
    config.debug("Extracting sections ...");

    const content = fs.readFileSync(config.finalChangesetFilePath, "utf-8");

    // config.sections = _extractOld(config, content);

    // Todo: done
    // we should detect sections just by ## and section name. equal sign characters are not important.
    // also, section end should not be mandatory.
    config.sections = extractChangesetItems(config, content);

    config.debug3("\nCurrent sections", config.sections);
}

function getChangesetHeader(config, type = "txt", changesetName) {
    return `${type == "sql" ? '--': '#'} ***            Changeset ${config.realBranchName || changesetName || config.finalChangesetName}          ***`
}

function getSectionMarker(section) {
    let result;

    switch (section) {
        case "customStart": result = "Custom-Start"; break;
        case "schemas": result = "Schemas"; break;
        case "assemblies": result = "Assemblies"; break;
        case "types": result = "Types"; break;
        case "synonyms": result = "Synonyms"; break;
        case "sequences": result = "Sequences"; break;
        case "queues": result = "Service Queues"; break;
        case "statistics": result = "Statistics"; break;
        case "functions": result = "Functions"; break;
        case "procedures": result = "Procedures"; break;
        case "tables": result = "Tables"; break;
        case "relations": result = "Relations"; break;
        case "views": result = "Views"; break;
        case "indexes": result = "Indexes"; break;
        case "triggers": result = "Triggers"; break;
        case "customEnd": result = "Custom-End"; break;
    }

    return result;
}

function getSectionHeader(section, header, type = "txt") {
    const title = getSectionMarker(section);
    const space = ' '.repeat(parseInt((14 - title.length) / 2));
    const oneSpace = (14 - title.length) % 2 == 0 ? '': ' ';

    const result = header || ((type == "sql" ? "--": "##") + ` ===================== ${oneSpace}${space}${title}${space} ======================`);

    return result;
}

function getOrderedSections() {
    // order matters here.
    // this array specifies correct order by which sections should be processed

    return [
        "customStart",
        "assemblies",
        "schemas",
        "types",
        "sequences",
        "tables",
        "relations",
        "functions",
        "synonyms",
        "procedures",
        "queues",
        "views",
        "indexes",
        "triggers",
        "statistics",
        "customEnd",
    ]
}

function hasChangesetHeader(content, type = "txt") {
    if (base.isEmpty(content)) {
        return false;
    }
    
    if (type == "txt") {
        return /#[^\S\r\n]*\*\*\*[^\S\r\n]*Changeset[^\S\r\n]/.test(content);
    } else {
        return /#[^\S\r\n]*\*\*\*[^\S\r\n]*Changeset[^\S\r\n]/.test(content);
    }
}

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
        draft.header = [];
    }

    if (!base.isEmpty(content) && content.split("\n").filter(line => line.trim().startsWith("##")).length > 0) {
        let section = '';
        let isInHeader = true;
        let dropsAdded = false;
        const temp = createSectionsStore(true);

        function addNewItems() {
            if (section) {
                if (base.isArray(sections[section])) {
                    config.debug3(`\tsection ${chalk.yellow(section)}: adding missing items if not already added`);

                    for (let item of sections[section]) {
                        if (!temp[section].contains(item)) {
                            config.debug3(`\t\tadded ${item}`);

                            temp[section].push(item);

                            if (config.fullChangeset) {
                                draft[section].push(item);
                            } else {
                                result.push(item);
                            }
                        }
                    }
                } else if (isCustomStartSection(section) && dropStatements && !dropsAdded) {
                    config.debug3(`\t\tsection ${chalk.yellow(section)}: adding drop statements`);

                    if (config.fullChangeset) {
                        draft.customStart.push(dropStatements);
                    } else {
                        result.push(dropStatements);
                    }

                    dropsAdded = true;
                }
            }
        }

        for (let line of content.split("\n")) {
            const trimmedLine = line.trim();

            if (base.isNullOrEmpty(trimmedLine)) {
                if (config.fullChangeset) {
                    if (section) {
                        draft[section].push(line);
                    } else if (isInHeader) {
                        draft.header.push(line);
                    } else ;
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
                        customEndHeader = line;
                    }

                    isInHeader = false;

                    if (!section) {
                        section = sec;

                        config.debug3(`\tdetected section ${chalk.yellow(section)}`);
                    } else if (section == sec) {
                        if ((!isCustomEndSection(section) && trimmedLine.contains("end")) || /\(\s*end\s*\)/.test(line)) {
                            addNewItems();

                            section = "";
                        }
                    } else {
                        addNewItems();

                        config.debug3(`\tsection changed from ${chalk.yellow(section)} to ${chalk.yellow(sec)}`);

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
                    config.debug3(`\tskipped unknown section ${chalk.red(trimmedLine)}`);
                }

                continue;
            } else if (trimmedLine.startsWith("#")) {
                if (config.fullChangeset) {
                    if (section) {
                        draft[section].push(line);
                    } else if (isInHeader) {
                        draft.header.push(line);
                    } else ;
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
                if (!base.isSomeArray(draft[section]) && !config.fullChangeset) {
                    draft[section].push(true);
                }

                if (base.isArray(sections[section])) {
                    if (sections[section].contains(trimmedLine)) {
                        if (!temp[section].contains(trimmedLine)) {
                            if (config.fullChangeset) {
                                draft[section].push(line);
                            } else {
                                result.push(line);
                            }

                            temp[section].push(trimmedLine);
                        } else {
                            config.debug3(`\t\t${trimmedLine}: already exists`);
                        }
                    } else {
                        config.debug3(`\t\t${trimmedLine}: removed`);
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
            result.push(getChangesetHeader(config));
        }

        if (!base.isEmpty(content)) {
            result.push(content);
        }

        if (!config.fullChangeset) {
            result.push(getSectionHeader("customStart") + "\n");
        }

        newContent = true;
    }

    if (config.fullChangeset) {
        Object.keys(draft)
            .filter(section => section != "header" && !base.isSomeArray(draft[section]))
            .forEach(section => draft[section].push(getSectionHeader(section, isCustomEndSection(section) ? customEndHeader : "") + "\n"));

        if (base.isSomeArray(draft.header)) {
            result.push(...draft.header);
        }

        if (dropStatements && !dropsAdded) {
            draft.customStart.push(dropStatements);
        }

        getOrderedSections()
            .forEach(section => result.push(...draft[section]));
    } else {
        getOrderedSections()
            .filter(section => !base.isSomeArray(draft[section]))
            .forEach((section) => {
                const items = sections[section];
                const header = getSectionHeader(section, isCustomEndSection(section) ? customEndHeader : "");

                if (base.isString(items)) {
                    if (base.isSomeString(items.trim())) {
                        result.push(header);
                        result.push(items.trim());
                    }
                } else if (base.isSomeArray(items)) {
                    result.push(header);
                    result.push(items.join("\n"));
                }
            });

        if (newContent || base.isSomeArray(customEnd)) {
            result.push(getSectionHeader("customEnd", customEndHeader));
            result.push(customEnd.join("\n").trim());
        }
    }

    return result.join("\n");
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

    return base.isNullOrEmpty(config.error);
}

function promptUser(question, toLower = true) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            rl.close();
            
            const result = toLower ? answer.trim().toLowerCase(): answer.trim();
            
            resolve(result);
        });
    });
}

async function askIfGenerateDrops(config) {
    let result = false;

    // Todo: Done
    // move out this section and also cover committed deletions

    if (base.isSomeArray(config.finalDeleteds)) {
        const answer = await promptUser(`\nGenerate DROP statements (y/n)? `);

        result = answer == "y";
    }

    return result;
}

const generateDropQuery = (objectType, objectName) => {
    switch (objectType) {
        case "PROCEDURE":
        case "FUNCTION":
            return `
IF OBJECT_ID(N'${objectName}', N'${objectType[0]}') IS NOT NULL
DROP ${objectType} ${objectName};
GO
`;

        case "TABLE":
            return `
/*Note: Drop Table
IF OBJECT_ID(N'${objectName}', N'U') IS NOT NULL
DROP TABLE ${objectName};
GO
*/`;

        case "FOREIGN KEY":
            return `
/*Note: Drop the FOREIGN KEY from its table
ALTER TABLE table_name DROP CONSTRAINT ${objectName};
GO
*/`;

        case "TYPE":
            return `
IF EXISTS (SELECT 1 FROM sys.types WHERE name = '${objectName}')
DROP TYPE ${objectName};
GO
`;

        case "VIEW":
            return `
IF OBJECT_ID(N'${objectName}', N'V') IS NOT NULL
DROP VIEW ${objectName};
GO
`;

        case "INDEX":
            return `
/*Note: Drop the index from its table
DROP INDEX ${objectName} ON table_name;
GO
*/`;

        case "TRIGGER":
            return `
IF OBJECT_ID(N'${objectName}', N'TR') IS NOT NULL
DROP TRIGGER ${objectName};
GO
`;

        case "SCHEMA":
            return `
IF EXISTS (SELECT 1 FROM sys.schemas WHERE name = '${objectName}')
DROP SCHEMA ${objectName};
GO
`;

        default:
            return null;
    }
};

async function generateDropScriptsIfRequested(config) {
    if (await askIfGenerateDrops(config)) {
        config.debug("\nGenerating drop statements ...");
        
        const { finalDeleteds, folders } = config;
        const folderToObjectMap = {
            [folders.procedures]: "PROCEDURE",
            [folders.functions]: "FUNCTION",
            [folders.tables]: "TABLE",
            [folders.relations]: "FOREIGN KEY",
            [folders.types]: "TYPE",
            [folders.views]: "VIEW",
            [folders.indexes]: "INDEX",
            [folders.triggers]: "TRIGGER",
            [folders.schemas]: "SCHEMA",
            [folders.sequences]: "SEQUENCE",
            [folders.synonyms]: "SYNONYM",
            [folders.assemblies]: "ASSEMBLY",
            [folders.queues]: "QUEUE",
            [folders.statistics]: "STATISTICS",
        };

        const dropQuery = finalDeleteds
            .map(file => {
                const parts = file.split('/');
                const folderName = parts[1]; // exp: Procedures
                const objectName = parts.slice(parts.length - 1).join('.').replace('.sql', ''); // exp: dbo.sp01
                const objectType = folderToObjectMap[folderName];

                config.debug3({ parts, folderName, objectName, objectType });

                if (!objectType) {
                    console.warn(`${chalk.yellow("Warning:")} sql deleted file ignored ${file} (unknown type: ${objectType}).`);

                    return null;
                }

                // Generate the appropriate DROP query
                return generateDropQuery(objectType, objectName);
            })
            .filter(query => query) // Remove null values
            .join('\n'); // Combine queries

        config.debug3({ drops: dropQuery });

        config.dropStatements = dropQuery;
    }
}

function filterChanges(config, changes) {
    const folders = Object.values(config.folders);
    const result = changes.filter(file => {
        const isInScriptsFolder = folders.some(folder => file.startsWith(`${config.paths.scriptsFolderName}/${folder}`));
        const isSqlFile = file.endsWith(".sql");

        return isInScriptsFolder && isSqlFile;
    });

    return result;
}

async function getUncommittedSqlChanges(config, exclude) {
    const git = simpleGit();
    const changes = await git.status();
    const statuses = ['not_added', 'conflicted', 'created', 'deleted', 'ignored', 'modified', 'renamed'];
    const result = {};
    const all = [];

    config.debug2("git status", changes);

    statuses.filter(state => state != exclude)
        .forEach(state => {
            if (Array.isArray(changes[state])) {
                result[state] = filterChanges(config, changes[state]);

                all.push(...result[state]);
            }
        });

    result.all = all;

    return result;
}

async function checkUncommittedChanges(config) {
    let userChoice = "1";

    config.debug("Checking uncommitted sql changes ...");

    const changes = await getUncommittedSqlChanges(config);

    config.debug2({ changes });

    if (changes.all.length > 0) {
        do {
            console.warn(`
${chalk.yellow('Warning: You have uncommitted changes.')}`);

            userChoice = await promptUser(
                `\nChoose an option:
    1. Ignore
    2. Commit
    3. Show
    4. Cancel
    
Enter your choice: `);

            if (userChoice === "1") {
                break;
            } else if (userChoice === "2") {
                console.log("Committing changes...");

                config.error = await commitChanges(changes.all, "commited current changes");
                break;
            } else if (userChoice === "3") {
                const files = [];

                if (changes.modified.length > 0) {
                    files.push(chalk.whiteBright("\nModified files:"));
                    changes.modified.forEach(x => files.push(chalk.blue(x)));
                }
                if (changes.not_added.length > 0) {
                    files.push(chalk.whiteBright("\nUntracked files:"));
                    changes.not_added.forEach(x => files.push(chalk.green(x)));
                }
                if (changes.deleted.length > 0) {
                    files.push(chalk.whiteBright("\nDeleted files:"));
                    changes.deleted.forEach(x => files.push(chalk.red(x)));
                }

                if (files.length) {
                    console.log(files.join("\n"));
                } else {
                    console.log("\nNo uncommitted changes found.");
                }
            } else if (userChoice === "4") {
                console.log("\nOperation cancelled by the user.");
                userChoice = "";
                break;
            } else {
                console.log("Invalid choice.");
            }
        } while (true);
    } else {
        config.debug("No uncommitted change(s) found.");
    }

    if (!base.isArray(changes.deleted) || userChoice == "1") {
        changes.deleted = [];
    }

    config.userChoice = userChoice;
    config.uncommittedChanges = changes;
    
    return base.isNullOrEmpty(config.error) && base.isSomeString(userChoice);
}

function getNewChangeset(config) {
    let changeset;
    let changesetFilePath;

    const { now, currentBranch, mergeBase } = config;
    const { changesetsPath } = config.paths;

    //TODO: Done
    // add branch hash to changesets file name
    const hash = mergeBase ? '_' + mergeBase.substr(0, 8): '';
    
    changeset = `${now}${hash}_${currentBranch}.txt`;
    changesetFilePath = path.join(changesetsPath, changeset);

    return { changeset, changesetFilePath }
}

function createNewChangeset(config) {
    let changeset;
    let changesetFilePath;

    try {
        const cs = getNewChangeset(config);

        const content = getChangesetHeader(config) +
            (config.fullChangeset ? "\n" + getOrderedSections().map(section => getSectionHeader(section) + "\n").join("\n") : "");
        changeset = cs.changeset;
        changesetFilePath = cs.changesetFilePath;

        fs.writeFileSync(changesetFilePath, content);

        console.log(`New changeset ${chalk.cyan(path.parse(changeset).name)} created.`);
    } catch (ex) {
        if (changeset) {
            throw new exception.Exception(`Generating new changeset ${chalk.cyan(path.parse(changeset).name)} failed`, ex);
        } else {
            throw new exception.Exception(`Generating new changeset failed`, ex);
        }
    }

    return { changeset, changesetFilePath }
}

function getOrCreateChangeset(config) {
    let { changesetsPath } = config.paths;

    // Todo: Done
    // we should look up changeset not just by branch name, but also by branch hash.

    // Todo: Done
    // there is no need to check whether current changeset is followed by other changesets and ...

    config.debug("Preparing final changeset ...");

    if (!config.changeset) {
        if (!config.oldChangeset) {
            config.debug("No existing changeset found. Creating a new changeset ...");

            const cs = createNewChangeset(config);
            
            config.finalChangeset = cs.changeset;
            config.finalChangesetFilePath = cs.changesetFilePath;
            config.isNewChangeset = true;
        } else {
            config.debug("Working on existing changeset ...");

            config.finalChangeset = config.newChangeset;
            config.finalChangesetFilePath = config.newChangesetFilePath;
            config.isNewChangeset = false;    
        }
    } else {
        config.debug(`${chalk.yellow("Warning:")}: manual changeset specified (${chalk.cyan(config.changeset)}).`);

        config.finalChangeset = config.changeset;
        config.finalChangesetFilePath = config.changesetFilePath;
        config.isNewChangeset = false;
    }

    config.finalChangesetName = path.parse(config.finalChangeset).name;    config.scriptFilePath = path.join(changesetsPath, `${config.finalChangesetName}.sql`);
}

function isValidScriptFile(config, file) {
    if (!file.startsWith(config.paths.scriptsFolderName)) {
        return false
    }

    if (!file.toLowerCase().endsWith('.sql')) {
        return false;
    }

    const segments = file.split('/');

    if (!segments.length) {
        return false;
    }

    if (segments.length < 2) {
        return false;
    }
    
    const subdir = segments[1].toLowerCase();

    const validFolders = Object.values(config.folders).map(folder => folder.toLowerCase());

    if (!validFolders.some(folder => subdir.startsWith(folder))) {
        console.warn(chalk.yellow(`Warning: sql changed file ${file} ignored (unknown folder type).`));

        return false;
    }

    return true;
}

function getChangedFiles(config) {
    const { masterBranchName } = config;

    config.debug("Getting all changes in .sql files ...");

    try {
        const mergeBase = child_process.execSync(
            `git merge-base HEAD ${masterBranchName}`,
            { encoding: "utf-8" }
        ).trim();

        const modifiedAndAddedFiles = child_process.execSync(
            `git diff --name-only --diff-filter=MA ${mergeBase} HEAD`,
            { encoding: "utf-8" }
        )
            .split("\n")
            .map((file) => file.trim())
            .filter((file) => file);

        const renamedFiles = child_process.execSync(
            `git diff --name-status --diff-filter=R ${mergeBase} HEAD`,
            { encoding: "utf-8" }
        )
            .split("\n")
            .filter(x => x).map(line => {
                const parts = line.split("\t");

                return { old: parts[1], new: parts[2] }
            });

        const deletedFiles = child_process.execSync(
            `git diff --name-only --diff-filter=D ${mergeBase} HEAD`,
            { encoding: "utf-8" }
        )
            .split("\n")
            .map((file) => file.trim())
            .filter((file) => file);

        config.debug2("\nrenamed files", renamedFiles);
        config.debug2("\ndeleted files", deletedFiles);

        const allFiles = [...modifiedAndAddedFiles, ...renamedFiles.map(x => x.new)];
        const finalChanges = allFiles.filter((file) => isValidScriptFile(config, file));

        config.debug2("\nFinal changes", finalChanges);

        config.finalDeleteds = [...config.uncommittedChanges.deleted, ...deletedFiles];
        config.finalChanges = finalChanges;
        config.renamedFiles = renamedFiles;
    } catch (ex) {
        throw new exception.Exception(`Error extracting changes from git logs`, ex);
    }
}

async function compareWithOrigin(config) {
    const { masterBranchName } = config;

    config.debug(`Initializing simpleGit ...`);

    const git = simpleGit();

    if (masterBranchName) {
        try {
            do {
                config.debug(`Checking if we are a git repo ...`);

                let isRepo = false;

                try {
                    isRepo = await git.checkIsRepo();
                } catch (ex) {
                    config.error = ex;

                    break;
                }

                if (!isRepo) {
                    config.error = 'We are not a git repository.';
                    break;
                } else {
                    config.debug("We are a git repo.");
                }

                config.debug("Fetching origin ...");

                const [origin, branch] = masterBranchName.split("/");

                config.debug2({ origin, branch });

                child_process.execSync(
                    `git fetch ${origin} ${branch}`,
                    { encoding: "utf-8" }
                );

                // await git.fetch(origin, branch);

                config.debug("Fetch completed.");
                config.debug(`Checking if ${chalk.yellow(masterBranchName)} is valid ...`);

                const branches = child_process.execSync(
                    `git branch -r`,
                    { encoding: "utf-8" }
                ).trim()
                    .split("\n")
                    .map(x => x.trim())
                    .filter(x => x);

                //branches = await git.branch(['-r']);

                config.debug4('remote branches', branches);

                if (!branches || !branches.includes(masterBranchName)) {
                    config.error = `Remote branch ${chalk.yellow(masterBranchName)} does not exist.`;
                    break;
                } else {
                    config.debug(`${masterBranchName} is valid.`);
                }

                // const base = await git.raw(['merge-base', realBranchName, masterBranchName]);
                const base = config.mergeBase;

                config.debug3(`Getting git logs from base ${base} to ${masterBranchName}...`);

                config.debug(`Checking if we are behind ${masterBranchName} ...`);

                // const logs = await git.log({ from: base, to: masterBranchName });

                const logs = child_process.execSync(
                    `git log ${base}..${masterBranchName} --oneline`,
                    { encoding: "utf-8" }
                ).trim()
                .split("\n")
                .filter(x => x && x.trim().length > 0);

                config.debug3('\nlogs', logs);

                if (logs.length > 0) {
                    console.warn(`${chalk.yellow("Warning:")} you are behind ${masterBranchName} by ${logs.length} commits.`);
                    console.log(`Please run ${chalk.yellow(`git pull | git merge | git push`)} to sync with the latest changes from ${masterBranchName}.`);

                    config.error = "Operation aborted.";
                } else {
                    config.debug(`We are not behind ${masterBranchName}.`);
                }
            } while (false);
        } catch (ex) {
            config.error = new exception.Exception(`Error checking ${masterBranchName} branch:`, ex);
        }
    } else {
        config.error = "no master branch is specified";
    }

    return base.isNullOrEmpty(config.error);
}
// export default c1;

function getAppVersion(config, changesetName) {
    const template = `-- ${config.appVersionSprocName}\n` + (base.isSomeString(config.appVersionSprocTemplate) ?
        config.appVersionSprocTemplate :
        `
go
create or alter proc ${config.appVersionSprocName} as select '{ts}' as applyDate, '{changesetName}' as changeset
go
`);
    const res = ts.Timestamper({
        locale: `${config.timestampLocale}`,
        template: template.replace('{changesetName}', changesetName),
        format: config.appVersionFormat,
        skipOutput: true
    });

    if (!res.success) {
        throw new exception.Exception(`Timestamp using ${chalk.yellow("@puya/ts")} not generated successfully.`, res.err);
    }

    return res.data;
}

function getAllSqlFiles(config, dir, level = 0) {
    let result = [];

    if (level == 0) {
        config.debug("Getting all .sql files ...");
    }

    if (fs.existsSync(dir)) {
        const list = fs.readdirSync(dir);

        list.forEach((file) => {
            const fullPath = path.join(dir, file);
            const stat = fs.statSync(fullPath);

            if (stat && stat.isDirectory()) {
                result = result.concat(getAllSqlFiles(config, fullPath, level + 1));
            } else if (fullPath.toLowerCase().endsWith(".sql")) {
                result.push(fullPath);
            }
        });
    }

    if (level == 0) {
        config.debug("Total .sql files = ", result.length);
    }

    return result;
}

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
        throw new exception.Exception(`Unsupported encoding ${chalk.yellow(result)} (${info.encoding}) in ${filepath}`);
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
        if (base.isArray(sections[section])) {
            for (let item of sections[section]) {
                objects.push({ type: section, name: item });
            }
        }
    }

    config.debug2(`\tTotal objects: ${objects.length}`);

    return { objects, customStart, customEnd }
}

function write(config, key, items, minify = false) {
    let result = "";
    const header = getSectionHeader(key, "", "sql") + "\n";

    if (base.isString(items)) {
        if (base.isSomeString(items.trim())) {
            result = header + items.trim();
        }
    } else if (base.isArray(items)) {
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

        if (result) {
            result = header + result;
        }
    }

    return result;
}

async function renderChangesetScript(config, changesetPath, changesetName, deleteds, allFiles, appendAppVersion = true) {
    let error;
    const sb = createSectionsStore();

    config.debug(`Rendering changeset ${changesetName} ...`);
    config.debug2(`\t${changesetPath}`);

    const { objects, customStart, customEnd } = extractObjects(config, changesetPath);

    config.debug2('extracted objects', objects);

    if (!base.isArray(deleteds)) {
        deleteds = [];
    }

    if (!base.isArray(allFiles)) {
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


                if (base.isNullOrEmpty(config.folders[obj.type])) {
                    throw new exception.Exception(`Missing script folder for ${chalk.yellow(obj.type)}`)
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

    config.debug7({ sb });

    const hasAnything = getOrderedSections()
        .some(section => base.isString(sb[section]) ? !base.isEmpty(sb[section]) : base.isSomeArray(sb[section]));

    const script = getChangesetHeader(config, "sql", changesetName) + "\n" +
        getOrderedSections()
            .map(section => write(config, section, sb[section]))
            .filter(x => x)
            .join("\n") +
        (appendAppVersion ? getAppVersion(config, changesetName) : '');

    return { script, error, hasAnything }
}

async function saveFinalScript(config, allFiles) {
    config.debug("Saving final changeset script ...");

    const {
        scriptFilePath,
        finalChangeset,
        finalChangesetName,
        finalChangesetFilePath,
        finalDeleteds,
        isNewChangeset
    } = config;
    const { script, error, hasAnything } = await renderChangesetScript(config, finalChangesetFilePath, finalChangesetName, finalDeleteds, allFiles, false);

    let old;
    let hasChanges = true;

    if (!error) {
        if (fs.existsSync(scriptFilePath)) {
            old = fs.readFileSync(scriptFilePath, "utf-8");
        }

        config.finalScript = `${script}${getAppVersion(config, finalChangesetName)}`;

        if (old) {
            const i = old.lastIndexOf(`-- ${config.appVersionSprocName}`);

            if (i >= 0) {
                const scriptOld = old.substr(0, i).trim();
                const scriptNew = script.trim();

                hasChanges = scriptNew != scriptOld;

                config.debug2(`Script diff: old = ${scriptOld.length}, new = ${scriptNew.length}`);
                config.debug7(`scripts`, { old: scriptOld, "new": scriptNew });
            } else {
                config.debug2(`Script diff: not applicable`);
            }
        }

        fs.writeFileSync(scriptFilePath, script, "utf-8");

        config.debug(`changeset ${chalk.gray(finalChangesetName)} script saved`);

        const changes = [scriptFilePath];

        config.error = await commitChanges(changes, `changeset ${finalChangeset}: script ${isNewChangeset ? "created" : `updated`}.`);

        if (!config.error) {
            config.changesetScriptChanged = true;
        }
    } else {
        config.error = error;

        console.warn(chalk.yellow(`WARNING: changeset template created, but rendering it was not successful.\n\tChangeset script is not in sync with its template.`));
    }

    config.hasAnything = hasAnything;
    config.hasChanges = !error && hasChanges;

    return base.isNullOrEmpty(config.error);
}

function updateSections(config, allFiles) {
    const { folders, sections, finalDeleteds, finalChanges } = config;

    config.debug("Updating sections with new changes ...");
    config.debug2({ finalDeleteds });

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
                        console.warn(`${chalk.yellow("Warning: ")}${fileName} removed from changeset (its file is deleted).\n`);

                        const index = sections[section].findIndex(x => equals(x, fileName) || equals(x, nonSchemaFileName));

                        if (index >= 0) {
                            config.debug3(`\t\tremoved`);

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

                        const rename = config.renamedFiles.find(x => {
                            const filePath = x.new;
                            const _fileName = path.basename(filePath);

                            return filePath.contains(folder) && _fileName.contains(fileName);
                        });

                        if (rename) {
                            finalDeleteds.push(rename.old);
                            //                         console.warn(`\n${chalk.yellow(`Warning:`)} detected script rename (${chalk.yellow(fileName)}).
                            // Don't forget to add ${chalk.yellow("DROP statement")} for old script into ${chalk.yellow("Custom-Start")} section of the Changeset to drop the old object.`);
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
    });

    config.debug("\nchecking if items exist ...");

    for (const [section, folder] of Object.entries(folders)) {
        for (let item of sections[section]) {
            if (base.isEmpty(item)) {
                continue;
            }

            let found = false;

            for (const filePath of allFiles) {
                const fileName = path.basename(filePath);

                if (filePath.contains(folder) && fileName.contains(item)) {
                    found = true;

                    break;
                }
            }

            if (!found && !config.renamedFiles.find(x => {
                const filePath = x.new;
                const fileName = path.basename(filePath);

                return filePath.contains(folder) && fileName.contains(item);
            })) {
                config.error = `The source file for changeset item '${chalk.yellow(item)}' in ${chalk.yellow(folder)} folder was not found.
\tEither remove ${chalk.yellow(item)} from your changeset or create such a file in your repo.`;

                break
            }
        }

        if (config.error) {
            break;
        }
    }

    config.debug2("\nupdated sections", sections);

    return base.isNullOrEmpty(config.error);
}

function checkIfBranchAlreadyMerged(config) {
    const { realBranchName, masterBranchName } = config;

    try {
        config.debug("Checking if branch already merged ...");
        
        const result = child_process.execSync(
            `git merge-base --is-ancestor ${realBranchName} ${masterBranchName} && echo "merged" || echo "not merged"`,
            { encoding: "utf-8" }
        );

        if (result.trim() == "merged") {
            config.error = `branch ${realBranchName} already merged into ${masterBranchName}.
Changing already merged branches is forbidden.
Please create a new branch.`;
        } else {
            config.debug("Branch is ok (not merged).");
        }
    } catch (ex) {
        config.error = new exception.Exception("Error happened while checking branch with origin", ex);
    }

    return base.isNullOrEmpty(config.error);
}

async function updateChangesetNameIfNeeded(config) {
    let { changesetsPath } = config.paths;

    if (!config.changeset && config.oldChangeset) {
        try {
            const changes = [];
            const cs = getNewChangeset(config);

            config.newChangeset = cs.changeset;
            config.newChangesetName = path.parse(config.newChangeset).name;
            config.newChangesetFilePath = cs.changesetFilePath;

            changes.push(config.oldChangesetFilePath);
            changes.push(config.newChangesetFilePath);
            
            fs.renameSync(config.oldChangesetFilePath, config.newChangesetFilePath);

            const oldSqlFileName = config.oldChangesetName + '.sql';
            config.oldSqlFilePath = path.join(changesetsPath, oldSqlFileName);

            if (fs.existsSync(config.oldSqlFilePath)) {
                const newSqlFileName = config.newChangesetName + '.sql';
                const newSqlFilePath = path.join(changesetsPath, newSqlFileName);

                changes.push(config.oldSqlFilePath);
                changes.push(newSqlFilePath);

                fs.renameSync(config.oldSqlFilePath, newSqlFilePath);
            }

            config.debug2("changeset timestamp changes", changes);

            // we directly commit changeset timestamp update.
            // this is necessary. we do not ask user consent on this.

            config.error = await commitChanges(changes, `changeset name updated.`);

            if (!config.error) {
                config.debug(`Changeset timestamp updated.`);
                config.debug2(`  old: ${chalk.blue(config.oldChangesetName)}, new: ${chalk.cyan(config.newChangesetName)}`);
            } else {
                config.error = new exception.Exception(`committing changeset name failed (old: ${config.oldChangesetName}, new: ${config.newChangesetName}).`, config.error);
            }
        } catch (ex) {
            config.error = new exception.Exception(`updating changeset name failed.`, ex);
        }
    }

    return base.isNullOrEmpty(config.error);
}

async function changesFolderIsReady(config) {
    config.debug2(`Checking if ${config.paths.changesetFolderName} folder is ready (does not have uncommitted changes) ...`);

    const git = simpleGit();
    const changes = await git.status();
    const statuses = ['not_added', 'conflicted', 'created', 'deleted', 'ignored', 'modified', 'renamed'];
    let result = true;

    config.debug2("git status", changes);

    if (base.isObject(changes)) {
        for (let status of statuses) {
            const changeList = changes[status];

            if (Array.isArray(changeList)) {
                if (changeList.find(file => file.startsWith(`${config.paths.changesetFolderName}`))) {
                    result = false;
                    break;
                }
            }
        }
    }

    if (result) {
        config.debug2(`${config.paths.changesetFolderName} folder is ok.`);
    }

    return result;
}

async function createOrUpdateChangeset(config) {
    if (!config.debugMode) {
        console.log((config.oldChangeset ? "Updating" : "Creating") + ` changeset ...`);
    }

    try {
        do {
            if (!await changesFolderIsReady(config)) {
                console.log(`Please commit or discard changes in ${chalk.yellow(config.paths.changesetFolderName)} folder first.`);
                break;
            }

            if (!await compareWithOrigin(config)) {
                break
            }

            // TODO: Done
            // if current branch already merged with origin, exit.
            // we should not allow changing previous branches.
            // we show a message that user should create a new branch
            // if he intends to change previous branches.

            if (!checkIfBranchAlreadyMerged(config)) {
                break
            }

            // Todo: Done
            // we should update changeset timestamp and mergeBase always.

            if (!await updateChangesetNameIfNeeded(config)) {
                break
            }

            if (!await checkUncommittedChanges(config)) {
                break;
            }

            getOrCreateChangeset(config);

            extractSections(config);

            getChangedFiles(config);

            // Todo: Done
            // merge deletedFiles from getChangedFiles() and config.uncommittedChanges.deleted

            const allFiles = getAllSqlFiles(config, config.paths.scriptsPath);

            if (!updateSections(config, allFiles)) {
                break;
            }

            // Todo: Done
            // detect and warn about changeset items that cannot be found in file system

            await generateDropScriptsIfRequested(config);

            if (!await finalizeChangeset(config)) {
                break;
            }

            if (!await saveFinalScript(config, allFiles)) {
                break;
            }

            if (!await testAndCommitChangeset(config)) {
                break;
            }

            console.log('Operation completed.');
        } while (false);
    } catch (ex) {
        config.error = ex;
    } finally {
        // restoreChangesIfNeeded(config)
    }

    return config.error;
}

class FileHelper {
    static deleteFile(filepath) {
        if (fs.existsSync(filepath)) {
            fs.unlinkSync(filepath);
        }
    }
    static deleteFiles(...filepaths) {
        for (let filepath of filepaths) {
            FileHelper.deleteFile(filepath);
        }
    }
    static createFile(basePath, fileName, content) {
        let alreadyExists;
        const filePath = path.join(basePath, fileName);

        if (!fs.existsSync(filePath)) {
            fs.writeFileSync(filePath, content, "utf8");

            alreadyExists = false;
        } else {
            alreadyExists = true;
        }

        return { filePath, alreadyExists };
    }
    static createDir(basePath, folder) {
        let alreadyExists;
        const folderPath = path.join(basePath, folder);

        if (!fs.existsSync(folderPath)) {
            fs.mkdirSync(folderPath, { recursive: true });

            alreadyExists = false;
        } else {
            alreadyExists = true;
        }

        return { folderPath, alreadyExists };
    }
}

async function initGitRepo(config) {
    let error;

    config.debug(`Checking if we are a git repo ...\n`);

    const git = simpleGit();

    let hasGitRepo = await git.checkIsRepo();

    if (!hasGitRepo) {
        try {
            await git.init();

            console.log("Initialized a new git repository successfully.");
        } catch (ex) {
            error = new exception.Exception("Initializing git repository failed", ex);
        }
    } else {
        config.debug("We are in a git repo.");
    }

    return error;
}

function gitignoreContent() {
    return `# SQL Server files
*.mdf
*.ldf
*.ndf

# User-specific files
*.rsuser
*.suo
*.user
*.userosscache
*.sln.docstates

# User-specific files (MonoDevelop/Xamarin Studio)
*.userprefs

# Visual Studio cache files
.vs/

# Node.js
node_modules/

# Dist and publish
/dist
/publish

# Microsoft Azure
csx/
*.build.csdef

# pdcsc-config
pdcsc-config.development.json
pdcsc-config.production.json

# Logs and backups
/Changes/error.log
/Changes/*~.txt
`;
}

function pdcscConfigContent(config) {
    const dbName = config.database?.database || "MyDb";
    const configContent = {
        database: {
            server: config.database?.server || "127.0.0.1",
            user: config.database?.user || "myuser",
            password: "****",
            database: dbName,
            encrypt: config.database?.encrypt || false
        }
    };

    if (config.initfull) {
        console.log("Initializing a full pdcsc.config.");

        configContent.pipeline = "gitlabs";
        configContent.masterBranchName = "origin/main";
        configContent.appVersionSprocName = "dbo.getAppVersion";
        configContent.appVersionFormat = "YYYY-MM-DD HH:mm:ss";
        configContent.timestampLocale = "en";
        configContent.changesetsTableName = "Changesets";
        configContent.backupDbName = "TempBackupDB";
        configContent.defaultCodePage = "";
        configContent.paths = {
            backupDir: "C:\\temp\\",
            changesetFolderName: "Changes",
            scriptsFolderName: "Scripts",
        };
        configContent.folders = {
            procedures: "Procedures",
            functions: "Functions",
            tables: "Tables",
            relations: "Relations",
            types: "Types",
            views: "Views",
            indexes: "Indexes",
            triggers: "Triggers",
            schemas: "Schemas",
            sequences: "Sequences",
            synonyms: "Synonyms",
            queues: "Queues",
            assemblies: "Assemblies",
            statistics: "Statistics"
        };
    }

    return JSON.stringify(configContent, null, 4);
}

function gitlabCiContent() {
    return `stages:
  - build

variables:
  GIT_DEPTH: 0
  DB_PASS: "$\{SQLSERVER_DB_PASS\}"

before_merge_build:
  stage: build
  image: node:alpine
  script:
    - echo "Installing dependencies..."
    - apk update && apk add git
    - npm i @puya/pdcsc -g
    - |
      if [ "$CI_MERGE_REQUEST_SOURCE_BRANCH_NAME" = "dev" ] || [ "$CI_MERGE_REQUEST_SOURCE_BRANCH_NAME" = "main" ]; then
        pdcsc apply -c "pdcsc-config-$\{CI_MERGE_REQUEST_TARGET_BRANCH_NAME\}.json" -dbm -p "$DB_PASS"
      else
        pdcsc pipeline -c "pdcsc-config-$\{CI_MERGE_REQUEST_TARGET_BRANCH_NAME\}.json" -dbm -p "$DB_PASS"
      fi
  rules:
    - when: manual`;
}

function azuredevopsPipelineContent() {
  return `trigger:
  branches:
    include:
      - dev
      - main

variables:
  GIT_DEPTH: 0
  DB_PASS: $(SQLSERVER_DB_PASS)

stages:
  - stage: Build
    jobs:
      - job: BeforeMergeBuild
        displayName: "Before Merge Build"
        pool:
          vmImage: "ubuntu-latest"
        steps:
          - script: |
              echo "Installing dependencies..."
              sudo apt-get update && sudo apt-get install -y git
              npm install -g @puya/pdcsc
              if [[ "$(Build.SourceBranchName)" == "dev" || "$(Build.SourceBranchName)" == "main" ]]; then
                pdcsc apply -c "pdcsc-config-$(System.PullRequest.TargetBranchName).json" -dbm -f -p "$(DB_PASS)"
              else
                pdcsc pipeline -c "pdcsc-config-$(System.PullRequest.TargetBranchName).json" -dbm -p "$(DB_PASS)"
              fi
            displayName: "Run Build Script"
          condition: eq(variables['Build.Reason'], 'Manual')
`;
}

function createFile(config, name, fnContent) {
    let content = "";

    if (base.isFunction(fnContent)) {
        content = fnContent(config);
    } else if (base.isString(fnContent)) {
        content = fnContent;
    }

    const { filePath, alreadyExists } = FileHelper.createFile(config.basePath, name, content);

    if (!alreadyExists) {
        console.log(`Creating ${chalk.yellow(name)}: ${chalk.green("created")}`);
    } else {
        console.log(`Creating ${chalk.yellow(name)}: ${chalk.magenta("already exists")}`);
    }

    return filePath;
}

function createFolder(folderPath, parent, folder) {
    const { alreadyExists } = FileHelper.createDir(folderPath, folder);

    if (!alreadyExists) {
        console.log(`Creating /${chalk.yellow((parent ? parent + "/" : "") + folder)}: ${chalk.green("created")}`);
    } else {
        console.log(`Creating /${chalk.yellow((parent ? parent + "/" : "") + folder)}: ${chalk.magenta("already exists")}`);
    }
}

async function initProject(config) {
    let error;

    const { basePath, paths, folders } = config;

    do {
        try {
            error = await initGitRepo(config);

            if (error) {
                break;
            }

            console.log("");

            createFolder(basePath, "", "Scripts");

            Object.values(folders).forEach(folder => createFolder(basePath + '/' + paths.scriptsFolderName, "Scripts", folder));

            createFolder(basePath, "", "Changes");

            const gitlabCI = createFile(config, ".gitlab-ci.yml", gitlabCiContent);
            const azurePipelines = createFile(config, "azure-pipelines.yml", azuredevopsPipelineContent);
            const gitIgnore = createFile(config, ".gitignore", gitignoreContent);
            const pdcscConfig = createFile(config, "pdcsc-config.json", pdcscConfigContent);
            const dbName = config.database?.database || "MyDb";
            const customConfigDev = JSON.stringify({
                database: {
                    database: `${dbName}_dev`,
                    password: config.database?.password || "****"
                },
                masterBranchName: "origin/dev"
            }, null, 4);
            const customConfigMain = JSON.stringify({
                database: {
                    database: `${dbName}_main`,
                    password: config.database?.password || "****"
                },
                masterBranchName: "origin/main"
            }, null, 4);

            createFile(config, "pdcsc-config.development.json", customConfigDev);
            createFile(config, "pdcsc-config.production.json", customConfigMain);

            config.debug("Committing changes ...");

            error = await commitChanges([gitlabCI, azurePipelines, pdcscConfig, gitIgnore], "initialized files and folders.");

            console.log("\nDone.");
        } catch (ex) { error = ex; }
    } while (false);

    return error;
}

async function ensureChangesTableCreated(config) {
    let error;

    const { db, changesetsTableName } = config;

    if (config.forceChangesetsTable) {
        console.log(`Ensuring journal table ${chalk.yellow(changesetsTableName)} existence ...`);


        const query = `IF OBJECT_ID('${changesetsTableName}', 'U') IS NULL
                        CREATE TABLE ${changesetsTableName}
                        (
                            [Id] INT IDENTITY(1,1) PRIMARY KEY,
                            [Name] NVARCHAR(255) NOT NULL,
                            [Date] DATETIME NOT NULL DEFAULT(GETDATE())
                        );
                        ELSE
                            select 1 as Result;`;
        config.debug4(query);

        const rs = await db.executeQuery({ query });

        if (rs && rs.length && rs[0] && rs[0].Result == 1) {
            console.log("journal table already exists");
        } else {
            console.log("journal table created.");
        }
    } else {
        console.log(`Checking journal table ${chalk.yellow(changesetsTableName)} existence ...`);

        const query = `
IF OBJECT_ID('${changesetsTableName}', 'U') IS NULL
    SELECT 0 AS Result
ELSE
    SELECT 1 AS Result`;

        config.debug4(query);

        const rs = await db.executeQuery({ query });

        const result = rs && rs.length && rs[0] ? rs[0].Result : false;

        if (!result) {
            error = new exception.Exception(`Journal table ${changesetsTableName} not found. Use -f or --force to create journal table.`);
        } else {
            console.log("journal table exists");
        }
    }

    return error;
}

async function addChangesetToDatabase(config, changeset, i) {
    let error;
    const { db, changesetsTableName } = config;

    console.log(`  Journaling changeset ...`);

    try {
        const query = `INSERT INTO ${changesetsTableName} ([name]) VALUES ('${changeset.name}')`;

        config.debug4(query);

        await db.executeQuery({ query });
    } catch (ex) {
        error = new exception.Exception(`Journaling changeset${base.isNullOrEmpty(i) ? "" : ` #${i}`} ${changeset.name} to database ${config.database.database} failed.`, ex);
    }

    return error;
}

async function runAndAddChangeset(config, changeset, script, i) {
    const { db, changesetsTableName } = config;
    let error;

    console.log(`${base.isEmpty(i) ? '?' : i}. Executing changeset ${chalk.cyan(changeset.name)} ...`);

    try {
        const rs = await db.executeQuery({
            query: `
select case
            when exists
            (
                select 1 from ${changesetsTableName} where Name = '${changeset.name}'
            ) then 1
             else 0
        end as alredyExecuted`
        });

        if (rs && rs.length && rs[0] == 1) {
            console.log(chalk.blue("\tAlready Journaled"));
        } else {
            await db.executeBatch({ content: script });

            console.log(chalk.green("\tSucceeded"));

            error = await addChangesetToDatabase(config, changeset, i);
        }
    } catch (ex) {
        console.log(chalk.red("\tFailed"));

        error = new exception.Exception(`Executing changeset #${base.isEmpty(i) ? '?' : i} ${changeset.name} was not successful.`, ex);

        createErrorLog(config, ex);
    }

    return error;
}

async function getChangesetScript(config, changeset, i) {
    let error;
    let script;

    if (fs.existsSync(changeset.sqlPath)) {
        config.debug2(`${i}. ${changeset.name}: .sql found`);
        script = fs.readFileSync(changeset.sqlPath, "utf-8");
    } else {
        config.debug2(`${i}. ${changeset.name}: .sql not found`);
        error = new exception.Exception(`changeset ${changeset.name} .sql file not found.`);
    }

    return { error, script }
}

async function testPendingChangesets(config, pendingChangesets) {
    let error;
    const scripts = {};
    const { applyMode } = config;

    console.log("Bundling/Testing pending changesets ...");

    const canTest = applyMode == ApplyMode.TestAndUpdate || applyMode == ApplyMode.Test;

    try {
        const _scripts = [];
        let i = 1;

        for (let changeset of pendingChangesets) {
            let script;
            const cr = await getChangesetScript(config, changeset, i);

            if (cr.error) {
                error = cr.error;
                break;
            } else {
                script = cr.script;

                scripts[changeset.name] = cr.script;
            }

            if (config.applyOneByOne && canTest) {
                try {
                    config.debug2(`\tTesting ...`);

                    await config.db.executeBatch({ content: cr.script });

                    config.debug2(chalk.green("\t\tSucceeded"));
                } catch (ex) {
                    config.debug2(chalk.red("\t\tFailed"));

                    error = new exception.Exception(`Testing changeset ${changeset.name} was not successful.`, ex);

                    createErrorLog(config, ex);

                    break;
                }
            }

            _scripts.push(script);

            i++;
        }

        if (!error) {
            console.log("Bundling ...");

            config.debug2(`joining all scripts (count = ${_scripts.length}) ...`);

            const all = _scripts.join("\ngo\n");

            if (config.debugMode) {
                config.debug2(`Creating all.sql script ...`);

                FileHelper.createFile(config.paths.scriptsPath, "all.sql", all);
            }

            if (!config.applyOneByOne && canTest) {
                console.log("Testing bundle ...");

                error = await testScript(config, all);
            }
        }
    } catch (ex) {
        error = new exception.Exception("Testing pending changesets was not successful.", ex);
    }

    return { error, scripts };
}

const formatDate = (date) => {
    const _date = new Date(date);
    const year = _date.getFullYear();
    const month = String(_date.getMonth() + 1).padStart(2, '0'); // Months are 0-based
    const day = String(_date.getDate()).padStart(2, '0');
    const hours = String(_date.getHours()).padStart(2, '0');
    const minutes = String(_date.getMinutes()).padStart(2, '0');
    const seconds = String(_date.getSeconds()).padStart(2, '0');

    return `${year}/${month}/${day} ${hours}:${minutes}:${seconds}`;
};

async function getLastExecutedChangeset(config) {
    const { db, changesetsTableName } = config;

    let result;

    console.log("Finding last changeset that was executed on database ...");

    try {
        const query = `SELECT TOP 1 [name], [date] FROM ${changesetsTableName} ORDER BY [name] DESC`;

        config.debug4(query);

        const rs = await db.executeQuery({ query });

        result = rs && rs.length ? rs[0] : null;

        if (result) {
            console.log(`Last changeset is ${chalk.cyan(result.name)}, executed at ${chalk.cyan(formatDate(result.date))}.`);
        } else {
            console.log('No changeset has already executed on database.');
        }
    } catch (ex) {
        throw new exception.Exception(`Cannot read last executed changeset from database`, ex);
    }

    return result;
}

//Todo: Done
// no need to convert timestamp to a javascript Date

function extractDateFromString(config, inputString) {

    config.debug3(`extracting date from: ${inputString}`);

    try {
        const regex = /^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})?/;
        const match = inputString.match(regex);

        if (match) {
            const year = parseInt(match[1], 10);
            const month = parseInt(match[2], 10);
            const day = parseInt(match[3], 10);
            const hour = parseInt(match[4], 10);
            const minute = parseInt(match[5], 10);
            const second = match[6] ? parseInt(match[6], 10) : 0;

            config.debug7({ year, month, day, hour, minute, second });

            //const date = new Date(Date.UTC(year, month - 1, day, hour, minute, second));

            const formattedDate = match[0]; // formattedDate = date.toISOString().replace('T', ' ').replace(/\.\d{3}Z/, '');

            return formattedDate;
        }
    } catch (ex) {
        throw new exception.Exception("Extracting date error", ex);
    }
}

function getPendingChangesets(config, lastExecutedChangeset, executedChangesets) {
    console.log("Getting pending changesets ...");

    const result = [];
    const files = fs.readdirSync(config.paths.changesetsPath);
    const changesets = files
        .filter(filepath => path.extname(filepath) == ".txt" && extractDateFromString(config, filepath))
        .map(filepath => path.parse(filepath).name)
        .map(name => ({
            name,
            path: path.join(config.paths.changesetsPath, name + ".txt"),
            sqlPath: path.join(config.paths.changesetsPath, name + ".sql"),
            date: extractDateFromString(config, name)
        }));

    // ensure changesets that are older than lastExecutedChangeset will be also executed on database.
    // this happens when we ahve two or more teams who have distinct workflows (each team has their
    // own dev branch on which they merge their branches with).
    console.log("\tchecking older changesets ...");

    changesets.forEach(changeset => {
        if (!executedChangesets.find(cs => changeset.name.equals(cs.name))) {
            config.debug2(`\t\tadded changeset ${chalk.yellow(changeset.name)}`);

            result.push(changeset);
        }
    });

    const lastExecutedChangesetName = lastExecutedChangeset?.name;
    lastExecutedChangesetName ? extractDateFromString(config, lastExecutedChangesetName) : null;

    console.log("\tchecking newer changesets ...");

    /*
    for (const changeset of changesets) {
        const match = changeset.name.match(/^(\d{14})/);

        if (!match) {
            continue;
        }

        if (!lastExecutedDate || changeset.date > lastExecutedDate) {
            config.debug2(`\t\tadded changeset ${chalk.yellow(changeset.name)}`);

            if (!result.contains(changeset)) {
                result.push(changeset);
            }
        }
    }
    */

    result.sort((a, b) => a.date - b.date);

    config.debug2("Pending Changesets", result.map(changeset => changeset.name));

    if (result.length === 0) {
        console.log("No pending changeset found. Database is up-to-date.");
    } else {
        console.log(`${result.length} changesets found.`);
    }

    return result;
}

async function getExecutedChangesets(config) {
    const { db, changesetsTableName } = config;

    let result;

    console.log("Retrieving all changesets executed on database ...");

    try {
        // we should not sort by date. changesets can be executed anytime.
        // we MUST sort by name. changesets' name already has a timestamp
        // which provides sortability.

        const query = `SELECT [name], [date] FROM ${changesetsTableName} ORDER BY [name]`;

        config.debug4(query);

        const rs = await db.executeQuery({ query });

        result = rs || [];

        if (result) {
            console.log(`Number of already executed changesets: ${chalk.cyan(result.length)}`);
        } else {
            console.log('No changeset already executed on database.');
        }
    } catch (ex) {
        throw new exception.Exception(`Cannot read changesets from database`, ex);
    }

    return result;
}

async function run$1(config) {
    let error;
    const { applyMode } = config;

    // TODO: Done
    // exec mode
    //  test
    //  test & update   * default
    //  update

    do {
        try {
            console.log(`Apply mode = ${chalk.yellow(ApplyMode[applyMode])}, one-by-one = ${chalk.yellow(config.applyOneByOne)}, database = ${chalk.magenta(config.database.database)}`);

            error = await ensureChangesTableCreated(config);

            if (error) {
                break;
            }

            if (!fs.existsSync(config.paths.changesetsPath)) {
                error = `Changes folder ${config.paths.changesetsPath} not found.`;
                break;
            }

            const executedChangesets = await getExecutedChangesets(config);
            const lastExecutedChangeset = await getLastExecutedChangeset(config);
            const pendingChangesets = getPendingChangesets(config, lastExecutedChangeset, executedChangesets);

            config.debug3({ pendingChangesets });

            if (!pendingChangesets.length) {
                console.log("No pending changeset found. Database is up-to-date.");
                break;
            }

            let scripts;

            const tr = await testPendingChangesets(config, pendingChangesets);

            error = tr.error;
            scripts = tr.scripts;

            if (error) {
                console.log("Operation aborted.");
                break;
            }
            // TODO: Done
            // run changeset one by one instead of merging them together and create a large script and run that.

            if (applyMode == ApplyMode.TestAndUpdate || applyMode == ApplyMode.Update) {
                console.log(`Applying changesets ...`);

                let i = 1;

                for (let changeset of pendingChangesets) {
                    // config.debug3(`${i}. changeset: ${changeset.name}`);

                    const script = scripts[changeset.name];

                    // config.debug3(`\tscript length: ${script?.length}`);

                    error = await runAndAddChangeset(config, changeset, script, i);

                    if (error) {
                        console.log("Operation aborted due to errors.");

                        break;
                    }

                    i++;
                }
            }
        } catch (ex) {
            error = new exception.Exception('updating database failed.', ex);
        }
    } while (false);

    if (!error) {
        config.debug("Operation completed.");
    }

    return error;
}

async function getChangesetContent(config) {
    config.debug("Getting changeset content ...");

    let content;
    let error;
    let changesetName;
    const { oldChangeset, oldChangesetFilePath, realBranchName } = config;
    const { changesetsPath } = config.paths;

    // Todo: Done
    // we should find changeset based on branchname AND merge-base

    if (oldChangeset) {
        const existingDate = extractDateFromString(config, oldChangeset);

        if (!existingDate) {
            console.warn(chalk.yellow(`Changeset has no date! checking other commits skipped!`));
        } else {

            // Todo: Done
            // if there is a git commit after last pdcsc execution,
            // we should stop pipeline and generate error.
            // user must always use pdcsc.
            const lastCommit = child_process.execSync('git log --pretty=format:"%s" HEAD^..HEAD ', { encoding: "utf-8" }).trim();

            config.debug("Last commit = " + lastCommit + "\n");

            if (lastCommit && !lastCommit.startsWith('pdcsc:')) {
                error = `Changeset is not up-to-date (other commits found after last changeset push).
    Please update your changeset and try again.`;
            } else {
                // Todo: Done
                // we should exit pipeline if we detect our changeset is followed by other changesets
                // i.e. other branches are merged before us (our timestamp is behind them).

                const fileNames = fs.readdirSync(changesetsPath);

                if (fileNames.filter(file => file.endsWith(".txt")).some(x => extractDateFromString(config, x) > existingDate)) {
                    error = `The changeset ${chalk.cyan(oldChangeset)} is followed by other changesets.
    Cannot merge branch. Please sync your branch and try again.`;
                } else {
                    // Todo: Done
                    // we should generate changeset script dynamically, not read it from .sql
                    changesetName = path.parse(oldChangeset).name;

                    const scriptFile = path.join(changesetsPath, changesetName + ".sql");

                    if (!fs.existsSync(scriptFile)) {
                        error = `Missing changeset .sql file`;
                    }

                    const existingContent = fs.readFileSync(scriptFile, "utf-8");

                    const cr = await renderChangesetScript(config, oldChangesetFilePath, changesetName);

                    if (cr.error) {
                        error = cr.error;
                    } else if (cr.hasAnything) {
                        content = cr.script;
                        // Todo: Done
                        // generate error on missing changeset .sql file or .sql file content mismatch with rendered content

                        if (existingContent?.trim() != cr.script?.trim()) {
                            console.warn(`Warning: changeset's script is not in sync (old length: ${existingContent.length}, new length: ${cr.script.length}).`);
                            
                            config.debug5("existing content", existingContent);
                            config.debug5("new content", cr.script);
                        }
                    } else {
                        error = 'Changeset is empty and has no changes.';
                    }
                }
            }
        }
    } else {
        error = `No changeset found for branch ${chalk.yellow(realBranchName)}`;
    }

    return { content, error, changesetName };
}

async function executeChangeset(config, changeset) {
    let error;
    const { db } = config;
    const { database } = config.database;

    try {
        console.log(`Executing changeset on ${chalk.magenta(database)} database ...`);

        await db.executeBatch({ content: changeset });

        console.log(`Script executed successfully`);
    } catch (ex) {
        error = new exception.Exception(`executing changeset on ${database} failed`, ex);

        if (ex instanceof ExecuteQueryException) {
            config.debug5(`\n${ex.query}\n`);
        }
    }

    return error;
}

async function run(config) {
    let error;

    do {
        if (!await compareWithOrigin(config)) {
            error = config.error;
            break;
        }

        error = await ensureChangesTableCreated(config);

        if (error) {
            break;
        }

        const gcr = await getChangesetContent(config);

        if (gcr.error) {
            error = gcr.error;
            break;
        }

        if (!gcr.content) {
            break;
        }

        error = await testScript(config, gcr.content);

        if (error) {
            break;
        }

        error = await executeChangeset(config, gcr.content);

        if (error) {
            break;
        }

        error = await addChangesetToDatabase(config, { name: gcr.changesetName });
    } while (false);

    return error;
}

async function createJournalTable(config) {
    const error = await ensureChangesTableCreated(config);

    return error;
}

async function renderChangeset(config) {
    let error;
    let { paths, changeset } = config;
    let exit = false;

    if (base.isNullOrEmpty(changeset)) {
        console.log(`List of changesets:\n`);

        const files = fs.readdirSync(paths.changesetsPath);
        const changesets = files
            .filter(changeset => path.extname(changeset) == ".txt")
            .map(filepath => path.parse(filepath).name);

        while (base.isNullOrEmpty(changeset)) {
            changesets.forEach((x, i) => console.log(`${i + 1}. ${x}`));

            let answer = await promptUser(`\nPlease specify changeset (1-${changesets.length}, 0 = exit)? `);

            if (!base.isNumeric(answer)) {
                console.log(`\nInvalid value\n`);
                continue;
            }

            if (answer == "0") {
                exit = true;
                break;
            } else {
                answer = parseInt(answer);

                if (answer < 1 || answer > changesets.length) {
                    console.log(`\nNumber must be between ${1} and ${changesets.length}\n`);
                } else {
                    changeset = changesets[answer - 1];
                    break;
                }
            }
        }
    }

    if (!exit) {
        if (!changeset.endsWith(".txt")) {
            changeset = changeset + ".txt";
        }

        config.debug(`Selected changeset = ${changeset}`);

        const changesetFilePath = path.join(paths.changesetsPath, changeset);
        const cleanChangesetName = path.parse(changesetFilePath).name;
        const scriptFilePath = path.join(paths.changesetsPath, `${cleanChangesetName}.sql`);

        if (fs.existsSync(changesetFilePath)) {
            const rs = await renderChangesetScript(config, changesetFilePath, cleanChangesetName);

            if (!rs.error) {
                fs.writeFileSync(scriptFilePath, rs.script, "utf-8");

                console.log(`Changeset rendered.`);
            } else {
                error = rs.error;
            }
        } else {
            error = "Changeset not found.";
        }
    }

    return error;
}

function getCurrentBranch(config) {
    let currentBranch;
    let realBranchName;

    if (config.action == ActionType.pipeline) {
        if (config.pipeline === "gitlabs") {
            if (process.env.CI_COMMIT_REF_NAME) {
                currentBranch = process.env.CI_COMMIT_REF_NAME.trim().replace("/", "-");
            }

            realBranchName = process.env.CI_COMMIT_REF_NAME;
        } else if (config.pipeline === "azuredevops") {
            if (process.env.BUILD_SOURCEBRANCHNAME) {
                currentBranch = process.env.BUILD_SOURCEBRANCHNAME.trim().replace("/", "-");
            }

            realBranchName = process.env.BUILD_SOURCEBRANCHNAME;
        }
    } else {
        currentBranch = child_process.execSync("git rev-parse --abbrev-ref HEAD", { encoding: "utf-8" }).trim().replace("/", "-");
        realBranchName = child_process.execSync("git rev-parse --abbrev-ref HEAD", { encoding: "utf-8" }).trim();
    }

    return { currentBranch, realBranchName }
}

class DbHelperBase {
    constructor(config) {
        exception.throwIfInstantiateAbstract(DbHelperBase, this);

        this.config = Object.assign({}, config);
    }
    executeQuery({ query, dbName, noCatch = true }) {
        exception.throwNotImplementedException(`${this.constructor.name}.executeQuery`, this);
    }
    async executeBatch({ content }) {
        exception.throwNotImplementedException(`${this.constructor.name}.executeBatch`, this);
    }
    async dbExists(dbName) {
        exception.throwNotImplementedException(`${this.constructor.name}.dbExists`, this);
    }
}

class ConnectionException extends exception.Exception {
}

class DbHelperSqlServer extends DbHelperBase {
    constructor(config) {
        super(config);
    }
    getConnectionConfig(dbName) {
        return {
            user: this.config.user,
            password: this.config.password,
            server: this.config.server,
            database: base.isNullOrEmpty(dbName) ? this.config.database : dbName,
            options: { encrypt: base.isBool(this.config.encrypt) ? this.config.encrypt : false }
        }
    }
    async executeNonQuery({ query, dbName, options }) {
        let pool;
        let conn_ok = false;
        let error;

        query = query.replace(/^go\s+/i, '');

        if (options && options.minify) {
            query = this.cleanQuery(query);
        }

        try {
            try {
                pool = await sql.connect(this.getConnectionConfig(dbName));

                conn_ok = true;
            } catch (e) {
                error = new ConnectionException(`Database connection error`, e);
            }

            if (conn_ok) {
                await pool.request().query(query);
            }
        } catch (ex) {
            error = new ExecuteQueryException$1(query, ex);
        } finally {
            if (pool && conn_ok) {
                try {
                    await pool.close();
                } catch (e) {
                    console.error(e);
                }
            }
        }

        if (error) {
            throw error;
        }
    }
    async executeQuery({ query, dbName, options, noCatch = true }) {
        let result;
        let pool;
        let error;
        let conn_ok = false;

        query = query.replace(/^go\s+/i, '');

        if (options && options.minify) {
            query = this.cleanQuery(query);
        }

        try {
            try {
                pool = await sql.connect(this.getConnectionConfig(dbName));

                conn_ok = true;
            } catch (e) {
                error = new ConnectionException(`Database connection error`, e);
            }

            if (conn_ok) {
                result = await pool.request().query(query);

                result = result.recordset;
            }
        } catch (ex) {
            error = new ExecuteQueryException$1(query, ex);
        } finally {
            if (pool && conn_ok) {
                try {
                    await pool.close();
                } catch (e) {
                    console.error("DbHelperSqlServer", e);
                }
            }
        }

        if (error) {
            throw error;
        }

        return result;
    }
    async executeBatch({ content, dbName, options }) {
        const parts = content.split(/\s+GO\s+/i);

        for (let part of parts) {
            // TODO:
            // add line number to potential errors
            part = part.trim();

            if (part.length) {
                await this.executeQuery({ query: part, dbName, options });
            }
        }
    }
    async dbExists(dbName) {
        // this is to check whether connection is ok
        await this.executeNonQuery({ query: 'declare @a int', dbName: "master" });
        // checking given database existence
        await this.executeNonQuery({ query: 'use [' + dbName + ']', dbName: "master" });
    }
}

function getCurrentBranchChangeset(config) {
    let changeset;
    const { currentBranch, mergeBase } = config;
    const hash = mergeBase ? '_' + mergeBase.substr(0, 8) : '';
    const regex1 = new RegExp(`^\\d+${hash}_${currentBranch}\\.txt$`);
    const regex21 = new RegExp(`^\\d+_`);
    const regex22 = new RegExp(`${currentBranch}\\.txt$`);
    const { changesetsPath } = config.paths;
    const fileNames = fs.readdirSync(changesetsPath);
    let candidateChangeset;

    for (const fileName of fileNames) {
        if (regex21.test(fileName) && regex22.test(fileName)) {
            if (candidateChangeset) {
                console.log(`Skipped candidate changeset ${chalk.cyan(path.parse(candidateChangeset).name)}`);
            }

            candidateChangeset = fileName;
        }

        if (regex1.test(fileName)) {
            changeset = fileName;

            console.log(`Found existing changeset ${chalk.cyan(path.parse(changeset).name)}`);

            break;
        }
    }

    if (!changeset && candidateChangeset) {
        changeset = candidateChangeset;

        console.log(`Found candidate changeset ${chalk.cyan(path.parse(changeset).name)}.`);
    }

    return changeset;
}

class BaseSqlMinifier {
    constructor(config) {
        exception.throwIfInstantiateAbstract(BaseSqlMinifier, this);

        this.config = Object.assign({}, config);
    }
    minify(query) {
        exception.throwNotImplementedException(`${this.constructor.name}.minify`, this);
    }
}

class TSqlMinifier extends BaseSqlMinifier {
    minify(query) {
        let result = "";

        if (base.isSomeString(query)) {
            const states = {
                main: 0,
                stringStarted: 1,
                isSingleLineComment: 2,
                singleLineComment: 21,
                isMultiLineComment: 3,
                multiLineComment: 31,
                isMultiLineCommentEnding: 32,
                inNewLine: 6,
                inBracket: 7,
                whitespace: 8,
                isGo: 9,
                go: 91
            };
            let ch;
            let lastCh;
            let i = -1;
            let state = states.main;
            let temp = '';

            while (true) {
                if (lastCh) {
                    ch = lastCh;
                    lastCh = undefined;
                } else {
                    ch = query.substr(++i, 1);
                }

                switch (state) {
                    case states.main:
                        switch (ch) {
                            case "'":
                                result += ch;
                                state = states.stringStarted;
                                break;
                            case "-":
                                state = states.isSingleLineComment;
                                break;
                            case "/":
                                state = states.isMultiLineComment;
                                break;
                            case "\n":
                                state = states.inNewLine;
                                break;
                            case " ":
                            case "\t":
                            case "\v":
                                state = states.whitespace;
                                break;
                            case "[":
                                result += ch;
                                state = states.inBracket;
                                break;
                            default:
                                result += ch;
                                break;
                        }

                        break;
                    case states.stringStarted:
                        result += ch;

                        if (ch == "'") {
                            state = states.main;
                        }

                        break;
                    case states.isSingleLineComment:
                        if (ch == "-") {
                            state = states.singleLineComment;
                        } else {
                            result += "-" + ch;
                            state = states.main;
                        }

                        break;
                    case states.singleLineComment:
                        if (ch == "\n") {
                            state = states.main;
                        }
                        break;
                    case states.isMultiLineComment:
                        if (ch == "*") {
                            state = states.multiLineComment;
                        } else {
                            result += "/";
                            lastCh = ch;
                            state = states.main;
                        }

                        break;
                    case states.multiLineComment:
                        if (ch == "*") {
                            state = states.isMultiLineCommentEnding;
                        }
                        break;
                    case states.isMultiLineCommentEnding:
                        if (ch == "/") {
                            state = states.main;
                        } else {
                            lastCh = ch;
                            state = states.multiLineComment;
                        }
                        break;
                    case states.inBracket:
                        result += ch;

                        if (ch == "]") {
                            state = states.main;
                        }
                        break;
                    case states.whitespace:
                        if (ch == "\n") {
                            state = states.inNewLine;
                        } else if (!/\s/.test(ch)) {
                            result += " ";
                            lastCh = ch;
                            state = states.main;
                        }
                        break;
                    case states.inNewLine:
                        if (!/\s/.test(ch)) {
                            if (ch == 'g' || ch == 'G') {
                                temp = ch;
                                state = states.isGo;
                            } else {
                                result += ' ';
                                state = states.main;
                                lastCh = ch;
                            }
                            break;
                        }
                        break;
                    case states.isGo:
                        if (ch == 'o' || ch == 'O') {
                            temp += ch;
                            state = states.go;
                        } else {
                            result += " " + temp;
                            temp = '';
                            state = states.main;
                        }
                        break;
                    case states.go:
                        if (/\s/.test(ch)) {
                            result += "\n" + temp + "\n";
                            temp = "";
                        } else {
                            result += " " + temp;
                            temp = "";
                            lastCh = ch;
                        }

                        state = states.main;
                        break;
                }

                if (i >= query.length) {
                    break;
                }
            }
        }

        return result;
    }
}

class BaseSqlUglifier {
    constructor(config) {
        exception.throwIfInstantiateAbstract(BaseSqlUglifier, this);

        this.config = Object.assign({}, config);
    }
    uglify(query) {
        exception.throwNotImplementedException(`${this.constructor.name}.uglify`, this);
    }
}

class NullSqlUglifier extends BaseSqlUglifier {
    uglify(query) {
        return query;
    }
}

class BaseSqlObfuscator {
    constructor(config) {
        exception.throwIfInstantiateAbstract(BaseSqlObfuscator, this);

        this.config = Object.assign({}, config);
    }
    obfuscate(query) {
        exception.throwNotImplementedException(`${this.constructor.name}.obfuscate`, this);
    }
}

class NullSqlObfuscator extends BaseSqlObfuscator {
    obfuscate(query) {
        return query;
    }
}

function init(config) {
    config.paths.changesetsPath = path.join(config.basePath, config.paths.changesetFolderName);
    config.paths.scriptsPath = path.join(config.basePath, config.paths.scriptsFolderName);
    config.paths.backupFile = path.join(config.paths.backupDir, `backup-${config.database.database}-temp.bak`);

    config.folders = Object.assign({
        procedures: "Procedures",
        functions: "Functions",
        tables: "Tables",
        relations: "Relations",
        types: "Types",
        views: "Views",
        indexes: "Indexes",
        triggers: "Triggers",
        schemas: "Schemas",
        sequences: "Sequences",
        synonyms: "Synonyms",
        queues: "Queues",
        assemblies: "Assemblies",
        statistics: "Statistics",
    }, config.folders);

    config.db = new DbHelperSqlServer(config.database);
    config.minifier = new TSqlMinifier();
    config.uglifier = new NullSqlUglifier();
    config.obfuscator = new NullSqlObfuscator();
    config.now = moment().locale(config.timestampLocale).format('YYYYMMDDHHmmss');

    if (!config.cliMode && config.action != ActionType.apply) {
        let cmd;

        const { currentBranch, realBranchName } = getCurrentBranch(config);

        console.log(`Current branch: ${chalk.yellow(realBranchName)}`);

        config.currentBranch = currentBranch;
        config.realBranchName = realBranchName;

        if (!fs.readdirSync(config.paths.scriptsPath).some(folder =>
            Object.values(config.folders).some(f => folder === f)
        )) {
            throw new exception.Exception("Please specify all 'Scripts' subfolders in the 'folders' section of the config file.");
        }

        config.debug("getting merge-base ...", { realBranchName, masterBranch: config.masterBranchName });

        cmd = `git merge-base HEAD ${config.masterBranchName}`;

        config.debug4(cmd);

        try {
            config.mergeBase = child_process.execSync(cmd, { encoding: "utf-8" }).trim();
        } catch (ex) {
            throw new exception.Exception("Getting merge-base for current branch failed", ex);
        }

        if (!config.mergeBase) {
            throw new exception.Exception(`No merge-base for current branch (${realBranchName}) found. Please use pdcsc in another branch.`);
        } else {
            config.debug2('merge-base =', config.mergeBase);
        }

        config.debug("getting current branch changeset ...");

        config.oldChangeset = getCurrentBranchChangeset(config);

        if (config.oldChangeset) {
            config.oldChangesetName = path.parse(config.oldChangeset).name;
            config.oldChangesetFilePath = path.join(config.paths.changesetsPath, config.oldChangeset);
        }
    }

    config.debug6(`config = `, config);
}

function addDebugFunctions(config) {
    for (let i = 1; i < 10; i++) {
        config[`debug${i > 1 ? i : ''}`] = (...args) => {
            if (config.debugMode && (i == 1 || config.debugLevel.contains(`${i}`))) {
                console.log(...args);
            }
        };
    }
}

function read(args) {
    function getArg(arg, altArg) {
        let index = args.indexOf(arg);

        if (index < 0 && altArg) {
            index = args.indexOf(altArg);
        }

        const result = index >= 0 ? args[index + 1] : undefined;

        return result;
    }

    let config = {};
    let customConfig;
    let action;
    let applyMode;
    let applyOneByOne = false;
    let forceChangesetsTable = false;
    let fullChangeset = false;

    if (args.length && args[0] && !args[0].startsWith("-")) {
        action = args[0];
    }

    if (base.isEmpty(action)) {
        action = ActionType.roll;
    }

    if (action == "check-update") {
        action = ActionType.checkUpdate;
    } else if (action == "create-journal") {
        action = ActionType.createJournalTable;
    }

    if (!ActionType.isValid(action)) {
        throw new exception.Exception(`invalid action: ${action}`);
    }

    action = ActionType.getNumber(action);

    fullChangeset = args.includes("-fc") || args.includes("--full-changeset");
    forceChangesetsTable = action == ActionType.createJournalTable || args.includes("-f") || args.includes("--force");

    if (action == ActionType.apply) {
        applyMode = getArg("-m", "--mode");
        applyOneByOne = args.includes("-11") || args.includes("--one-by-one");

        if (base.isEmpty(applyMode)) {
            applyMode = ApplyMode.TestAndUpdate;
        }

        if (!ApplyMode.isValid(applyMode)) {
            throw new exception.Exception(`invalid apply mode: ${applyMode}`);
        }

        applyMode = ApplyMode.getNumber(applyMode);
    } else if (action == ActionType.render) {
        config.changeset = getArg("-cs", "--changeset");

        if (base.isNullOrEmpty(config.changeset) && !args[2].startsWith("-")) {
            config.changeset = args[2];
        }
    } else if (action == ActionType.init) {
        config.initfull = args.includes("-f") || args.includes("--full");
    }

    const cliMode = action == ActionType.init || action == ActionType.checkUpdate || action == ActionType.render || action == ActionType.createJournalTable;
    const renderMode = action == ActionType.roll || action == ActionType.render;
    const useMinification = renderMode && (args.includes("-m") || args.includes("--minify"));
    const useUglification = renderMode && (args.includes("-u") || args.includes("--uglify"));
    const useObfuscation = renderMode && (args.includes("-o") || args.includes("--obfuscate"));
    const debugMode = args.includes("-dbm") || args.includes("--debug-mode");
    const basePath = process.cwd();
    const server = getArg("-s", "--server");
    const user = getArg("-u", "--user");
    const password = getArg("-p", "--password");
    const dbName = getArg("-d", "--database");

    config.debugMode = debugMode;
    config.debugLevel = (getArg("-dbl", "--debug-level") || "").split("");

    addDebugFunctions(config);

    let configPath = getArg("-c", "--config");
    let customizedConfigPath;

    if (configPath) {
        configPath = path.join(basePath, configPath);

        if (!fs.existsSync(configPath)) {
            throw new exception.Exception(`config file ${chalk.yellow(configPath)} not found.`);
        }
    } else {
        configPath = path.join(basePath, `pdcsc-config.json`);
    }

    const config_key = process.env["PDCSC_CONFIG_KEY"] || "PDCSC_CONFIG_MODE";
    let config_mode = (process.env[config_key] || '').trim();

    if (config_mode) {
        config_mode = '.' + config_mode;
        customizedConfigPath = path.join(basePath, `pdcsc-config${config_mode}.json`);
    } else {
        config.debug(`config mode ${config_key} is empty`);
    }

    let _config;

    if (fs.existsSync(configPath)) {
        _config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
    } else {
        if (!cliMode) {
            throw new exception.Exception(`config file ${chalk.yellow(configPath)} not found.`);
        }
    }

    if (customizedConfigPath) {
        config.debug(`Reading custom config ${path.parse(customizedConfigPath).name} ...`);

        if (fs.existsSync(customizedConfigPath)) {
            customConfig = JSON.parse(fs.readFileSync(customizedConfigPath, "utf-8"));

            config.debug2(`custom config is`, customConfig);
        } else {
            if (!cliMode) {
                console.warn(chalk.yellow(`Warning: custom config file ${chalk.cyan(customizedConfigPath)} not found.`));
            }
        }
    } else {
        config.debug(`No custom config is set.`);
    }

    if (!base.isObject(_config)) {
        _config = {};
    }

    config.debug(`Merging config ...`);

    config = extensionsObject.merge({}, config, _config, customConfig, {
        basePath,
        action,
        cliMode,
        applyMode,
        applyOneByOne,
        forceChangesetsTable,
        useMinification,
        useUglification,
        useObfuscation,
        fullChangeset
    });

    if (!base.isObject(config.database)) {
        config.database = {};
    }

    if (dbName) {
        config.database.database = dbName;
    }
    if (server) {
        config.database.server = server;
    }
    if (user) {
        config.database.user = user;
    }
    if (password) {
        config.database.password = password;
    }

    config.database.encrypt = args.includes("-e") || args.includes("--encrypt");

    return config
}

function validate(config) {
    let error;

    do {
        if (!base.isObject(config.paths)) {
            config.paths = {};
        }

        if (base.isEmpty(config.paths.backupDir)) {
            config.paths.backupDir = "C:\\temp\\";
        }

        if (base.isEmpty(config.paths.changesetFolderName)) {
            config.paths.changesetFolderName = "Changes";
        }

        if (base.isEmpty(config.paths.scriptsFolderName)) {
            config.paths.scriptsFolderName = "Scripts";
        }

        if (config.changeset) {
            config.changesetFilePath = path.join(config.paths.changesetsPath, config.changeset);

            if (!fs.existsSync(config.changesetFilePath)) {
                if (!config.changeset.endsWith(".txt") && config.changeset.lastIndexOf(".") < 0) {
                    const _changeset = `${config.changeset}.txt`;
                    const _changesetFilePath = path.join(config.paths.changesetsPath, _changeset);

                    if (!fs.existsSync(_changesetFilePath)) {
                        error = `Changeset file ${chalk.cyan(config.changeset)} or ${chalk.cyan(_changeset)} not found.`;
                    } else {
                        config.changeset = _changeset;
                        config.changesetFilePath = _changesetFilePath;
                    }
                } else {
                    error = `Changeset file ${chalk.cyan(config.changeset)} not found.`;
                }
            }
        }

        if (error) {
            break;
        }
        
        if (base.isEmpty(config.pipeline)) {
            config.pipeline = "gitlabs";
        }

        config.pipeline = config.pipeline.toLowerCase();

        if (config.pipeline != "gitlabs" && config.pipeline != "azuredevops") {
            error = `Unsupported cicd: ${chalk.yellow(config.pipeline)}`;
            break;
        }

        if (base.isEmpty(config.backupDbName)) {
            config.backupDbName = "TempBackupDB";
        }

        if (base.isEmpty(config.masterBranchName)) {
            config.masterBranchName = "origin/main";
        }

        if (base.isEmpty(config.changesetsTableName)) {
            config.changesetsTableName = "Changesets";
        }

        if (base.isEmpty(config.appVersionFormat)) {
            config.appVersionFormat = "YYYY-MM-DD HH:mm:ss";
        }

        if (base.isEmpty(config.timestampLocale)) {
            config.timestampLocale = "en";
        }

        if (base.isEmpty(config.appVersionSprocName)) {
            config.appVersionSprocName = "dbo.getAppVersion";
        }

        if (config.cliMode) {
            break;
        }

        if (base.isEmpty(config.database.server)) {
            error = `database server not specified`;
        } else if (base.isEmpty(config.database.user)) {
            error = `database user not specified`;
        } else if (base.isEmpty(config.database.password)) {
            error = `database password not specified`;
        } else if (base.isEmpty(config.database.database)) {
            error = `database not specified`;
        }
    } while (false)

    return error;
}

async function getConfig(args) {
    let error;
    const config = read(args);

    error = validate(config);

    if (!error) {
        init(config);
    }

    return { config, error };
}

async function checkDbExistence(config) {
    let result = false;
    
    if (!config.cliMode) {
        config.debug(`Checking database ${chalk.magenta(config.database.database)} existence ...`);

        try {
            await config.db.dbExists(config.database.database);

            config.debug(`database exists`);

            result = true;
        } catch (ex) {
            config.error = ex;
        }
    } else {
        result = true;
    }

    return result;
}

function intro() {
    console.log(chalk.whiteBright(`Puya Data Changeset Creator ${version} 2024-2025\n`));
}

function help() {
    let help = `Usage: pdcsc [command] [[[args...]] [[[options...]]]
    command:
        init        initialize a new db repo containing an slim config
            args:
                -f or --full    generate full config
        roll        create/update changeset (default)
            args:
                -m or --minify      minifies generated script
                -u or --uglify      uglifies generated script
                -o or --obfuscate   obfuscates generated script
        pipeline    run on pipeline (should be used only in cicd .yml files)
        apply       apply all changesets in ./Changes folder on a database
            args:
                -m or --mode        apply mode (Test, Update, TestAndUpdate = default).
                -11 or --one-by-one apply changesets one by one
                -f or --force       force creating Changesets table
        render      generate .sql file for a changeset (overwrites existing)
            args:
                -cs or --changeset  changeset name (if not specified, uses changeset in current branch)
                -m or --minify      minifies generated script
                -u or --uglify      uglifies generated script
                -o or --obfuscate   obfuscates generated script
        check-update    checks npm to see whether pdcsc is up-to-date and a new version is available or not
        create-journal  creates journal table in the database (if not already existed)

    options (global):
        -v or --version                 show pdcsc version number
        -? or --help                    show help
        -c or --config                  use config file specified
        -fc or --full-changeset         generate full changeset (containing all sections)
        -s or --server                  database address (overrides pdcsc-config)
        -u or --user                    database user (overrides pdcsc-config)
        -p or --password                database password (overrides pdcsc-config)
        -d or --database                database name (overrides pdcsc-config)
        -e or --encrypt                 database connection encryption (overrides pdcsc-config)
        -dbm or --debug-mode            debug mode
        -dbl or --debug-level           specify debug level (1..9)
`;
    help = `Usage: pdcsc [command] [[[args...]] [[[options...]]]
command:
    init        initialize a new db repo containing an slim config
        args:
            -f or --full    generate full config
    roll        create/update changeset (default)
        args:
            -m or --minify      minifies sprocs, udfs, views, triggers
    pipeline    run on pipeline (should be used only in cicd .yml files)
    apply       apply all changesets in ./Changes folder on a database
        args:
            -m or --mode        apply mode (Test, Update, TestAndUpdate = default).
            -11 or --one-by-one apply changesets one by one
            -f or --force       force creating Changesets table
    render      generate .sql file for a changeset (overwrites existing)
        args:
            -cs or --changeset  changeset name (if not specified, uses changeset in current branch)
            -m or --minify      minifies sprocs, udfs, views, triggers
    check-update    checks npm to see whether pdcsc is up-to-date and a new version is available or not
    create-journal  creates journal table in the database (if not already existed)

options (global):
    -v or --version                 show pdcsc version number
    -? or --help                    show help
    -c or --config                  use config file specified
    -fc or --full-changeset         generate full changeset (containing all sections)
    -s or --server                  database address (overrides pdcsc-config)
    -u or --user                    database user (overrides pdcsc-config)
    -p or --password                database password (overrides pdcsc-config)
    -d or --database                database name (overrides pdcsc-config)
    -e or --encrypt                 database connection encryption (overrides pdcsc-config)
    -dbm or --debug-mode            debug mode
    -dbl or --debug-level           specify debug level (1..9)
`;
    console.log(help);
}

async function main() {
    intro();

    let exitCode = 0;
    let error;
    let config;

    try {
        const args = process.argv.slice(2);

        if (args.includes("-v") || args.includes("--version")) {
            console.log(`${name} version ${version}\n`);
        } else if (args.includes("-?") || args.includes("/?") || args.includes("/help") || args.includes("--help")) {
            help();
        } else {
            const gcr = await getConfig(args);

            config = gcr.config;
            error = gcr.error;

            if (!error) {
                if (await checkDbExistence(config)) {
                    switch (config.action) {
                        case ActionType.init:
                            error = await initProject(config);
                            break;
                        case ActionType.pipeline:
                            error = await run(config);
                            break;
                        case ActionType.apply:
                            error = await run$1(config);
                            break;
                        case ActionType.roll:
                            error = await createOrUpdateChangeset(config);
                            break;
                        case ActionType.render:
                            error = await renderChangeset(config);
                            break;
                        case ActionType.checkUpdate:
                            error = checkForUpdate(config);
                            break;
                        case ActionType.createJournalTable:
                            error = await createJournalTable(config);
                            break;
                    }
                } else {
                    error = config.error;
                }
            }
        }
    } catch (ex) {
        error = ex;
        exitCode = 2;
    } finally {
        if (error) {
            console.error(chalk.red(error.toString()));

            if (config && config.debugMode && config.debugLevel.contains("9") && error instanceof exception.Exception) {
                console.error(JSON.stringify(error, null, 4));
            }

            if (exitCode == 0) {
                exitCode = 1;
            }
        }
    }

    return { exitCode, config };
}

main().then(({ exitCode, config }) => {
    if (config) {
        config.debug({ exitCode });
    }

    process.exit(exitCode);
}).catch((...args) => {
    console.error(...args);

    process.exit(3);
});
