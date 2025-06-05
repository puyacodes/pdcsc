import ensureJournalTableCreated from "../runAllChangesets/ensureJournalTableCreated";

async function createJournalTable(config) {
    const error = await ensureJournalTableCreated(config);

    return error;
}

export default createJournalTable;