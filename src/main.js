import checkForUpdate from './checkForUpdate.js';
import { ActionType } from "./enums";
import { version } from "../package.json";
import {
    createChangeset,
    initProject,
    runAllChangesets,
    runOnPipline
} from "./actions";
import getConfig from "./config";

async function main() {
    let exitCode = 0;
    let config;
    let error;

    try {
        checkForUpdate(config);

        const args = process.argv.slice(2);

        config = await getConfig(args);

        switch (config.action) {
            case ActionType.getVersion:
                console.log("PDCSC version ", version);
                break;
            case ActionType.init:
            case ActionType.initfull:
                error = initProject(config);
                break;
            case ActionType.runOnPipline:
                error = await runOnPipline(config);
                break;
            case ActionType.runAllChangesets:
                error = await runAllChangesets(config);
                break;
            case ActionType.createChangeset:
                error = await createChangeset(config);
                break;
        }
    } catch (error) {
        exitCode = 1;
    }
    finally {
        if (error) {
            console.error(error);
        }
    }

    process.exit(exitCode);
}

export default main;
