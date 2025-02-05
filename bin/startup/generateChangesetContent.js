function generateChangesetContent(sections, dropQuery) {
    return `
    -- ===================== Custom-Start (start) ======================
    ${dropQuery ? dropQuery : ""}
    -- ===================== Custom-Start ( end ) ======================
    
    -- ===================== Types (start) ======================
    ${sections.types.join("\n")}
    -- ===================== Types ( end ) ======================
    
    -- ===================== Tables (start) ======================
    ${sections.tables.join("\n")}
    -- ===================== Tables ( end ) ======================
    
    -- ===================== Relations (start) ======================
    ${sections.relations.join("\n")}
    -- ===================== Relations ( end ) ======================
    
    -- ===================== Functions (start) ======================
    ${sections.functions.join("\n")}
    -- ===================== Functions ( end ) ======================
    
    -- ===================== SPROCs (start) ======================
    ${sections.procedures.join("\n")}
    -- ===================== SPROCs ( end ) ======================
    
    -- ===================== Views (start) ======================
    ${sections.views.join("\n")}
    -- ===================== Views ( end ) ======================
    
    -- ===================== Indexes (start) ======================
    ${sections.indexes.join("\n")}
    -- ===================== Indexes ( end ) ======================
    
    -- ===================== Triggers (start) ======================
    ${sections.triggers.join("\n")}
    -- ===================== Triggers ( end ) ======================

    -- ===================== Custom-End (start) ======================
    -- ===================== Custom-End ( end ) ======================
    `
};

module.exports = { generateChangesetContent }