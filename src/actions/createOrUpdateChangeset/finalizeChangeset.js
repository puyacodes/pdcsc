import chalk from "chalk";
import fs from "fs";
import commitChanges from "../../utils/commitChanges";
import { isNullOrEmpty } from "@locustjs/base";

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

    return isNullOrEmpty(config.error);
};

export default finalizeChangeset;