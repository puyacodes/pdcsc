import fs from "fs";
import path from "path";
import { hasBool, isBool, isEmpty, isNullOrEmpty, isObject, isSomeString } from "@locustjs/base";
import { merge } from "@locustjs/extensions-object";
import { ActionType, ApplyMode } from "../enums";
import { Exception } from "@locustjs/exception";
import chalk from "chalk";

function debug(debugMode, ...args) {
    if (debugMode) {
        console.log(...args)
    }
}

function read(args) {
    function getArg(arg, altArg) {
        let index = args.indexOf(arg);

        if (index < 0 && altArg) {
            index = args.indexOf(altArg);
        }

        const result = index >= 0 ? args[index + 1] : undefined;

        return result;
    }

    let config = {};
    let customConfig;
    let action;
    let applyMode;
    let forceMode = false;
    let applyOneByOne = false;

    if (args.length && args[0] && !args[0].startsWith("-")) {
        action = args[0];
    }

    if (isEmpty(action)) {
        action = ActionType.roll;
    }

    if (action == "check-update") {
        action = ActionType.checkUpdate;
    }

    if (!ActionType.isValid(action)) {
        throw new Exception(`invalid action: ${action}`);
    }

    action = ActionType.getNumber(action);

    if (action == ActionType.apply) {
        applyMode = getArg("-m", "--mode");
        forceMode = args.includes("-f") || args.includes("--force")
        applyOneByOne = args.includes("-11") || args.includes("--one-by-one");

        if (isEmpty(applyMode)) {
            applyMode = ApplyMode.TestAndUpdate;
        }

        if (!ApplyMode.isValid(applyMode)) {
            throw new Exception(`invalid apply mode: ${applyMode}`);
        }

        applyMode = ApplyMode.getNumber(applyMode);
    } else if (action == ActionType.render) {
        config.changeset = getArg("-cs", "--changeset");

        if (isNullOrEmpty(config.changeset) && !args[2].startsWith("-")) {
            config.changeset = args[2];
        }
    } else if (action == ActionType.init) {
        config.initfull = args.includes("-f") || args.includes("--full");
    }

    const cliMode = action == ActionType.init || action == ActionType.checkUpdate || action == ActionType.render;

    const useMinification = args.includes("-min") || args.includes("--minify");
    const debugMode = args.includes("-dbm") || args.includes("--debug-mode");
    const basePath = process.cwd();
    const server = getArg("-s", "--server");
    const user = getArg("-u", "--user");
    const password = getArg("-p", "--password");
    const dbName = getArg("-d", "--database");

    let configPath = getArg("-c", "--config");
    let customizedConfigPath;

    if (configPath) {
        configPath = path.join(basePath, configPath);

        if (!fs.existsSync(configPath)) {
            throw new Exception(`config file ${chalk.yellow(configPath)} not found.`);
        }
    } else {
        const config_key = process.env["PDCSC_CONFIG_KEY"] || "PDCSC_CONFIG_MODE";
        let config_mode = (process.env[config_key] || '').trim();

        if (config_mode) {
            config_mode = '.' + config_mode
        }

        configPath = path.join(basePath, `pdcsc-config.json`);
        customizedConfigPath = path.join(basePath, `pdcsc-config${config_mode}.json`);
    }

    if (fs.existsSync(configPath)) {
        config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
    } else {
        if (!cliMode) {
            throw new Exception(`config file ${chalk.yellow(configPath)} not found.`);
        }
    }

    if (customizedConfigPath) {
        if (fs.existsSync(customizedConfigPath)) {
            customConfig = JSON.parse(fs.readFileSync(customizedConfigPath, "utf-8"));
        } else {
            if (!cliMode) {
                console.warn(chalk.yellow(`Warning: custom config file ${chalk.cyan(customizedConfigPath)} not found.`));
            }
        }
    }

    if (!isObject(config)) {
        config = {}
    }

    config = merge({}, config, customConfig, {
        basePath,
        action,
        cliMode,
        applyMode,
        forceMode,
        applyOneByOne,
        useMinification
    })

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

    config.database.encrypt = getArg("-e", "--encrypt") == 'true';

    config.debugMode = debugMode;
    config.debugLevel = (getArg("-dbl", "--debug-level") || "").split("");

    config.debug = (...args) => {
        if (config.debugMode) {
            console.log(...args);
        }
    }
    config.debug1 = (...args) => {
        if (config.debugMode && config.debugLevel.contains("1")) {
            console.log(...args);
        }
    }
    config.debug2 = (...args) => {
        if (config.debugMode && config.debugLevel.contains("2")) {
            console.log(...args);
        }
    }
    config.debug3 = (...args) => {
        if (config.debugMode && config.debugLevel.contains("3")) {
            console.log(...args);
        }
    }
    config.debug4 = (...args) => {
        if (config.debugMode && config.debugLevel.contains("4")) {
            console.log(...args);
        }
    }
    config.debug5 = (...args) => {
        if (config.debugMode && config.debugLevel.contains("5")) {
            console.log(...args);
        }
    }

    return config
}

export default read;