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
import "./extensions";

async function main() {
    let exitCode = 0;
    let error;
    let config;

    try {
        const args = process.argv.slice(2);

        config = await getConfig(args);

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
            case ActionType.updateTimestamp:
                // TODO: new action ==> update timestamp
                // if user asks us to update changeset timestamp, update existing
                // changeset's timestamp with current ts
                break;
        }
    } catch (ex) {
        error = ex;
        exitCode = 1;
    } finally {
        if (error) {
            console.error(error.toString());

            if (config && config.debugMode && error.stackTrace) {
                console.log(error.stackTrace)
            }
        }
    }

    process.exit(exitCode);
}

export default main;
