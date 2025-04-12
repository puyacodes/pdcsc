import { Exception } from "@locustjs/exception";
import chalk from "chalk";
import fs from "fs";

function extractSections(config) {
    config.debug("Extracting sections ...");

    const tempSections = {
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
        customEnd: ""
    };
    const content = fs.readFileSync(config.finalChangesetFilePath, "utf-8");

    const sections = [
        { name: "customStart", start: "## ===================== Custom-Start (start) ======================", end: "## ===================== Custom-Start ( end ) ======================" },
        { name: "customEnd", start: "## ===================== Custom-End (start) ======================", end: "## ===================== Custom-End ( end ) ======================" },
        { name: "schemas", start: "## ===================== Schemas (start) ======================", end: "## ===================== Schemas ( end ) ======================" },
        { name: "types", start: "## ===================== Types (start) ======================", end: "## ===================== Types ( end ) ======================" },
        { name: "tables", start: "## ===================== Tables (start) ======================", end: "## ===================== Tables ( end ) ======================" },
        { name: "relations", start: "## ===================== Relations (start) ======================", end: "## ===================== Relations ( end ) ======================" },
        { name: "functions", start: "## ===================== Functions (start) ======================", end: "## ===================== Functions ( end ) ======================" },
        { name: "procedures", start: "## ===================== SPROCs (start) ======================", end: "## ===================== SPROCs ( end ) ======================" },
        { name: "views", start: "## ===================== Views (start) ======================", end: "## ===================== Views ( end ) ======================" },
        { name: "indexes", start: "## ===================== Indexes (start) ======================", end: "## ===================== Indexes ( end ) ======================" },
        { name: "triggers", start: "## ===================== Triggers (start) ======================", end: "## ===================== Triggers ( end ) ======================" }
    ];

    config.debug("Creating new sections ...");

    // Todo:
    // we should detect sections just by ## and section name. equal sign characters are not important.
    // also, section end should not be mandatory.
    
    sections.forEach(section => {
        // Check if the section exists
        config.debug4(`Checking section ${chalk.yellow(section.name)} existence ...`);

        if (!content.includes(section.start) || !content.includes(section.end)) {
            throw new Exception(`Section '${chalk.yellow(section.name)}' was not found in changeset.`);
        }

        // Extract current section content
        let innerContent = content
            .split(section.start)[1]
            .split(section.end)[0]
            .trim();

        if (innerContent.length > 0) {
            if (section.name != "customStart" && section.name != "customEnd") {
                const lines = innerContent.split("\n");

                lines.forEach(line => {
                    const trimmedLine = line.trim();

                    if (!tempSections[section.name].contains(trimmedLine)) {
                        config.debug3(`\tItem Added: ${chalk.gray(trimmedLine)}`);

                        tempSections[section.name].push(trimmedLine);
                    } else {
                        config.debug3(`\tItem exists: ${chalk.gray(trimmedLine)}`);
                    }
                });
            } else {
                tempSections[section.name] = innerContent;
            }
        }
    });

    config.sections = tempSections;
    
    config.debug3("\nCurrent sections", tempSections);
}

export default extractSections;