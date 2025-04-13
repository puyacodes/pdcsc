import fs from "fs";
import path from "path";
import { isObject } from "@locustjs/base";
import { merge } from "@locustjs/extensions-object";
import { ActionType, UpdateMode } from "../enums";
import { Exception } from "@locustjs/exception";
import chalk from "chalk";

function debug(debugMode, ...args) {
    if (debugMode) {
        console.log(...args)
    }
}
function read(args) {
    function getArg(arg) {
        const index = args.indexOf(arg);
        const result = index >= 0 ? args[index + 1] : undefined;

        return result;
    }

    let config = {};
    let customConfig;

    const debugMode = args.includes("-dbm");

    const basePath = process.cwd();
    const changeset = getArg("-cs");
    const server = getArg("-s");
    const user = getArg("-u");
    const password = getArg("-p");
    const dbName = getArg("-d");
    let configPath = getArg("-c");
    let customizedConfigPath;

    if (configPath) {
        configPath = path.join(basePath, configPath);

        if (!fs.existsSync(configPath)) {
            throw new Exception(`config file ${chalk.yellow(configPath)} not found.`);
        }
    } else {
        const config_key = process.env["PDCSC_CONFIG_KEY"] || "PDCSC_CONFIG_MODE";
        let config_mode = process.env[config_key];

        if (config_mode) {
            config_mode = '.' + config_mode
        }

        configPath = path.join(basePath, `pdcsc-config.json`);
        customizedConfigPath = path.join(basePath, `pdcsc-config${config_mode}.json`);
    }

    if (fs.existsSync(configPath)) {
        config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
    }

    if (fs.existsSync(customizedConfigPath)) {
        customConfig = JSON.parse(fs.readFileSync(customizedConfigPath, "utf-8"));
    }

    if (!isObject(config)) {
        config = {}
    }

    config = merge({}, config, customConfig, { configPath, changeset, basePath })

    if (!isObject(config.database)) {
        config.database = {}
    }

    if (dbName) {
        config.database.database = dbName;
    }
    if (server) {
        config.database.server = server;
    }
    if (user) {
        config.database.user = user;
    }
    if (password) {
        config.database.password = password;
    }

    if (args.includes("-v")) {
        config.action = ActionType.getVersion;
    } else if (args.includes("-init")) {
        config.action = ActionType.init;
    } else if (args.includes("--init-full")) {
        config.action = ActionType.initfull;
    } else if (args.includes("-rop")) {
        config.action = ActionType.runOnPipline;
    } else if (args.includes("-ud")) {
        config.action = ActionType.runAllChangesets;

        const updatesMode = getArg("-rum");

        config.updateMode = UpdateMode.isValid(updatesMode) ?
            UpdateMode.getNumber(updatesMode) : UpdateMode.TestAndUpdate;
    } else {
        config.action = ActionType.createOrUpdateChangeset;
    }

    config.debugMode = debugMode;
    config.debugLevel = (getArg("-dbl") || "").split("");
    config.pipelineMode = config.action == ActionType.runOnPipline;
    config.updateMode = config.action == ActionType.runAllChangesets;
    config.runMode = config.pipelineMode || config.updateMode;
    config.cliMode = config.action == ActionType.getVersion || config.action == ActionType.init || config.action == ActionType.initfull;

    return config
}

export default read;