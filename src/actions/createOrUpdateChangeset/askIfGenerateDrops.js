async function askIfGenerateDrops(config) {
    let result = false;

    // Todo: Done
    // move out this section and also cover committed deletions

    if (isSomeArray(config.finalDeleteds)) {
        const answer = await promptUser(`\nGenerate DROP statements (y/n)? `);

        result = answer == "y";
    }

    return result;
}

export default askIfGenerateDrops;