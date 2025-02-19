import validateCommandLineArgs from "./validations/validateCommandLineArgs.js";
import initialize from "./initialize.js";
import validateConfig from './validations/validateConfig.js';
import checkForUpdate from './checks/checkForUpdate.js';
import { ActionType } from "./enums";
import { version } from "../package.json";
import {
    createChangeset,
    initProject,
    runAllChangesets,
    runOnPipline
} from "./actions";

async function main() {
    let exitCode = 0;
    let config;

    try {
        const args = process.argv.slice(2);

        config = await validateCommandLineArgs(args);

        validateConfig(config);
        checkForUpdate(config);

        switch (config.action) {
            case ActionType.getVersion:
                console.log("PDCSC version ", version);
                break;
            case ActionType.init:
            case ActionType.initfull:
                initProject(config);
                break;
            default:
                await initialize(config);

                switch (config.action) {
                    case ActionType.runOnPipline:
                        await runOnPipline(config);
                        break;
                    case ActionType.runAllChangesets:
                        await runAllChangesets(config);
                        break;
                    case ActionType.createChangeset:
                        await createChangeset(config);
                        break;
                }

                break;
        }
    } catch (ex) {
        console.error(ex);
        
        exitCode = 1;
    }

    process.exit(exitCode);
}

export default main;
