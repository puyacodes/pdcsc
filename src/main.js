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
import renderChangeset from './actions/renderChangeset/index.js';

function intro() {
    console.log(chalk.whiteBright(`Puya Data Changeset Creator ${version} 2024-2025\n`));
}

function help() {
    console.log(`Usage: pdcsc [command] [[[args...]] [[[options...]]]
    command:
        init        initialize a new db repo containing an slim config
            args:
                -f or --full    generate full config
        roll        create/update changeset (default)
        pipeline    run on pipeline (should be used only in cicd .yml files)
        apply       apply all changesets in ./Changes folder on a database
            args:
                -m or --mode        apply mode (Test, Update, TestAndUpdate = default).
                -f or --force       force using changeset .sql files
                -11 or --one-by-one apply changesets one by one
        render      generate .sql file for a changeset (overwrites existing)
            args:
                -cs or --changeset  changeset name (if not specified, uses changeset in current branch)
        check-update    checks npm to see whether pdcsc is up-to-date and a new version is available or not

    options (global):
        -v or --version                 show pdcsc version number
        -? or --help                    show pdcsc usage
        -c or --config                  use config file specified
        -s or --server                  database address (overrides pdcsc-config)
        -u or --user                    database user (overrides pdcsc-config)
        -p or --password                database password (overrides pdcsc-config)
        -d or --database                database name (overrides pdcsc-config)
        -dbm or --debug-mode            debug mode
        -dbl or --debug-level           specify debug level (1,2,3,4)
`);
}

async function main() {
    intro();

    let exitCode = 0;
    let error;
    let config;

    try {
        const args = process.argv.slice(2);

        if (args.includes("-v") || args.includes("--version")) {
            console.log(`${name} version ${version})\n`);
        } else if (args.includes("-?") || args.includes("--help")) {
            help();
        } else {
            const gcr = await getConfig(args);

            config = gcr.config;
            error = gcr.error;

            if (!error) {
                if (await checkDbExistence(config)) {
                    switch (config.action) {
                        case ActionType.init:
                            error = await initProject(config);
                            break;
                        case ActionType.pipeline:
                            error = await runOnPipline(config);
                            break;
                        case ActionType.apply:
                            error = await runAllChangesets(config);
                            break;
                        case ActionType.roll:
                            error = await createOrUpdateChangeset(config);
                            break;
                        case ActionType.render:
                            error = await renderChangeset(config);
                            break;
                        case ActionType.checkUpdate:
                            error = checkForUpdate(config);
                            break;
                    }
                }
            }
        }
    } catch (ex) {
        error = ex;
        exitCode = 2;
    } finally {
        if (error) {
            console.error(chalk.red(error.toString()));

            if (config && config.debugMode && config.debugLevel.contains("5") && error instanceof Exception) {
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
