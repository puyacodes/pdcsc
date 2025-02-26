import { Exception } from "@locustjs/exception";
import fs from "fs";

function validateChangeSetFile(config) {
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
    const content = fs.readFileSync(config.changesetFilePath, "utf-8");

    const sections = [
        { name: "customStart", start: "## ===================== Custom-Start (start) ======================", end: "## ===================== Custom-Start ( end ) ======================" },
        { name: "customEnd", start: "## ===================== Custom-End (start) ======================", end: "## ===================== Custom-End ( end ) ======================" },
        { name: "types", start: "## ===================== Types (start) ======================", end: "## ===================== Types ( end ) ======================" },
        { name: "tables", start: "## ===================== Tables (start) ======================", end: "## ===================== Tables ( end ) ======================" },
        { name: "relations", start: "## ===================== Relations (start) ======================", end: "## ===================== Relations ( end ) ======================" },
        { name: "functions", start: "## ===================== Functions (start) ======================", end: "## ===================== Functions ( end ) ======================" },
        { name: "procedures", start: "## ===================== SPROCs (start) ======================", end: "## ===================== SPROCs ( end ) ======================" },
        { name: "views", start: "## ===================== Views (start) ======================", end: "## ===================== Views ( end ) ======================" },
        { name: "indexes", start: "## ===================== Indexes (start) ======================", end: "## ===================== Indexes ( end ) ======================" },
        { name: "triggers", start: "## ===================== Triggers (start) ======================", end: "## ===================== Triggers ( end ) ======================" }
    ];

    sections.forEach(section => {
        // Check if the section exists
        if (!content.includes(section.start) || !content.includes(section.end)) {
            throw new Exception(`Error: Section '${section.name}' was not found in changeset.`);
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

                    if (!tempSections[section.name].includes(trimmedLine)) {
                        tempSections[section.name].push(trimmedLine);
                    }
                    
                    // TODO: check object's file existence and throw error if it was not found
                });
            } else {
                tempSections[section.name] = innerContent;
            };
        };

    });

    // Write the updated content back to the file
    fs.writeFileSync(config.changesetFilePath, content, "utf-8");

    return tempSections;
}

export default validateChangeSetFile;