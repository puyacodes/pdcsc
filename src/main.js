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
import checkDbExistence from './checkDbExistence.js';

async function main() {
    let exitCode = 0;
    let error;

    try {
        const args = process.argv.slice(2);
        
        const config = await getConfig(args);

        checkForUpdate(config);
        checkDbExistence(config);

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
    } catch (ex) {
        error = ex;
        exitCode = 1;
    } finally {
        if (error) {
            console.error(error);
        }
    }

    process.exit(exitCode);
}

export default main;
