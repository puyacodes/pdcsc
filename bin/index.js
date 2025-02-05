#!/usr/bin/env node

const { validateCommandLineArgs } = require("./validations/validateCommandLineArgs.js");
const { initialize } = require("./initialize.js");
const { run } = require("./run.js");
const packageJson = require("../package.json");
const { createDefaultFolders } = require("./startup/createDefaultFolders.js");
let config;

async function main() {
    config = await validateCommandLineArgs();

    if (config.options.version) {
        const pdcscVersion = packageJson.version;
        console.log("PDCSC Version: ", pdcscVersion);
    } else if (config.options.init || config.options.initfull) {
        createDefaultFolders(config);
    }
    else {
        const result = await initialize(config);

        await run(config, result);
    }
}

main().catch((error) => {
    if (config.options.debugMode) {
        console.error(error);
    } else {
        console.error(error.message);
    }
    process.exit(1);
});
