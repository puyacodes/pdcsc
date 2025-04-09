import chalk from 'chalk';
import { name, version } from "../package.json";
import checkForUpdate from './checkForUpdate.js';
import { ActionType } from "./enums";
import {
    createOrUpdateChangeset,
    initProject,
    runAllChangesets,
    runOnPipline
} from "./actions";
import getConfig from "./config";
import checkDbExistence from './checkDbExistence.js';
import "./extensions";
import { Exception } from '@locustjs/exception';

function intro() {
    console.log(chalk.whiteBright(`Puya Data Changeset Creator 2024-2025\n`));
}

async function main() {
    intro();

    let exitCode = 0;
    let error;
    let config;

    try {
        const args = process.argv.slice(2);

        if (!process.argv.includes("-iuc")) {
            checkForUpdate();
        }

        const gcr = await getConfig(args);

        config = gcr.config;
        error = gcr.error;

        if (!error) {
            if (await checkDbExistence(config)) {
                switch (config.action) {
                    case ActionType.getVersion:
                        console.log(`${name} version ${version})\n`);
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
                    case ActionType.createOrUpdateChangeset:
                        error = await createOrUpdateChangeset(config);
                        break;
                }
            }
        }
    } catch (ex) {
        error = ex;
        exitCode = 2;
    } finally {
        if (error) {
            console.error(chalk.red(error.toString()));

            if (config && config.debugMode && error instanceof Exception) {
                console.error(JSON.stringify(error, null, 4))
            }

            if (exitCode == 0) {
                exitCode = 1;
            }
        }
    }

    return { exitCode, config };
}

export default main;
