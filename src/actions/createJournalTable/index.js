import ensureChangesTableCreated from "../runAllChangesets/ensureChangesTableCreated";

async function createJournalTable(config) {
    const error = await ensureChangesTableCreated(config);

    return error;
}

export default createJournalTable;