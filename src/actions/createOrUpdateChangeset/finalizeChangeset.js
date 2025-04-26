import chalk from "chalk";
import fs from "fs";

function finalizeChangeset(config) {
    const { sections, dropStatements } = config;

    config.debug("Finalizing changeset ...");

    const content = `
## ===================== Custom-Start (start) ======================
${sections.customStart}
${(dropStatements || "")}
## ===================== Custom-Start ( end ) ======================

## ===================== Schemas (start) ======================
${sections.schemas.join("\n")}
## ===================== Schemas ( end ) ======================

## ===================== Types (start) ======================
${sections.types.join("\n")}
## ===================== Types ( end ) ======================

## ===================== Tables (start) ======================
${sections.tables.join("\n")}
## ===================== Tables ( end ) ======================

## ===================== Relations (start) ======================
${sections.relations.join("\n")}
## ===================== Relations ( end ) ======================

## ===================== Functions (start) ======================
${sections.functions.join("\n")}
## ===================== Functions ( end ) ======================

## ===================== SPROCs (start) ======================
${sections.procedures.join("\n")}
## ===================== SPROCs ( end ) ======================

## ===================== Views (start) ======================
${sections.views.join("\n")}
## ===================== Views ( end ) ======================

## ===================== Indexes (start) ======================
${sections.indexes.join("\n")}
## ===================== Indexes ( end ) ======================

## ===================== Triggers (start) ======================
${sections.triggers.join("\n")}
## ===================== Triggers ( end ) ======================

## ===================== Custom-End (start) ======================
${sections.customEnd}
## ===================== Custom-End ( end ) ======================
`
    fs.writeFileSync(config.changesetTempFilePath, content, "utf-8");

    config.debug(`Temp changeset created: ${chalk.gray(config.changesetTemp)}`);
};

export default finalizeChangeset;