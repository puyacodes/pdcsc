const fs = require("fs");

function validateChangeSetFile(props) {
    let content = fs.readFileSync(props.changesetFilePath, "utf-8");

    const sections = [
        { name: "Custom-Start", start: "-- ===================== Custom-Start (start) ======================", end: "-- ===================== Custom-Start ( end ) ======================" },
        { name: "Custom-End", start: "-- ===================== Custom-End (start) ======================", end: "-- ===================== Custom-End ( end ) ======================" },
        { name: "types", start: "-- ===================== Types (start) ======================", end: "-- ===================== Types ( end ) ======================" },
        { name: "tables", start: "-- ===================== Tables (start) ======================", end: "-- ===================== Tables ( end ) ======================" },
        { name: "relations", start: "-- ===================== Relations (start) ======================", end: "-- ===================== Relations ( end ) ======================" },
        { name: "functions", start: "-- ===================== Functions (start) ======================", end: "-- ===================== Functions ( end ) ======================" },
        { name: "procedures", start: "-- ===================== SPROCs (start) ======================", end: "-- ===================== SPROCs ( end ) ======================" },
        { name: "views", start: "-- ===================== Views (start) ======================", end: "-- ===================== Views ( end ) ======================" },
        { name: "indexes", start: "-- ===================== Indexes (start) ======================", end: "-- ===================== Indexes ( end ) ======================" },
        { name: "triggers", start: "-- ===================== Triggers (start) ======================", end: "-- ===================== Triggers ( end ) ======================" }
    ];

    const normalizeFileName = (fileName) => {
        return fileName.trim().split("/").pop().replace(/^dbo\./i, "");
    };

    sections.forEach(section => {
        // Check if the section exists
        if (!content.includes(section.start) || !content.includes(section.end)) {
            throw new Error(`Error: Section '${section.name}' not found.`);
        }

        // Extract current section content
        innerContent = content
            .split(section.start)[1]
            .split(section.end)[0]
            .trim();

        if (innerContent.length > 0) {
            props.hasContent = true;
            if (section.name != "Custom-Start" && section.name != "Custom-End") {
                const lines = innerContent.split("\n");
                lines.forEach(line => {
                    const trimmedLine = line.trim();
                    const lineFileName = normalizeFileName(trimmedLine);
                    const isDeleted = props.deletedFiles.some(file => normalizeFileName(file) === lineFileName);
                    if (!isDeleted) {
                        if (!props.tempSections[section.name].includes(trimmedLine)) {
                            props.tempSections[section.name].push(trimmedLine);
                        }
                    }
                });
            };
        };

        // Remove deleted files from the section
        if (props.deletedFiles && props.deletedFiles.length > 0) {
            props.deletedFiles.forEach(file => {
                const deletedFileName = normalizeFileName(file);
                content = content.replace(new RegExp(`.*${deletedFileName}.*\\n?`, "g"), "");
            });
        }

        // Add new files or queries to the section
        if (props.newContent && props.newContent.length > 0) {
            const matchingLines = props.newContent.filter(line => line.includes(section.name));
            const nonMatchingLines = props.newContent.filter(line => !sections.some(sec => line.includes(sec.name)));

            if (matchingLines.length > 0) {
                const updatedInnerContent = `${innerContent}\n${matchingLines.join("\n")}`.trim();
                content = content.replace(
                    `${section.start}\n${innerContent}\n${section.end}`,
                    `${section.start}\n${updatedInnerContent}\n${section.end}`
                );

                // Update innerContent to reflect the changes
                innerContent = updatedInnerContent;
            }

            // Handle uncategorized lines for Custom section
            if (section.name === "Custom-Start" && nonMatchingLines.length > 0) {
                const updatedInnerContent = `${innerContent}\n${nonMatchingLines.join("\n")}`.trim();
                content = content.replace(
                    `${section.start}\n${innerContent}\n${section.end}`,
                    `${section.start}\n${updatedInnerContent}\n${section.end}`
                );

                // Update innerContent to reflect the changes
                innerContent = updatedInnerContent;
            }
        }
    });

    // Write the updated content back to the file
    fs.writeFileSync(props.changesetFilePath, content, "utf-8");
    return props.tempSections;
}

module.exports = { validateChangeSetFile }