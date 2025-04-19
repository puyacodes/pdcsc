import fs from "fs";
import path from "path";
import { isEmpty, isNullOrEmpty, isObject, isSomeString } from "@locustjs/base";
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

    if (args.length && args[0] && !args[0].startsWith("-")) {
        config.action = args[0];
    }

    if (isEmpty(config.action)) {
        config.action = ActionType.roll;
    }

    if (!ActionType.isValid(config.action)) {
        throw new Exception(`invalid action: ${config.action}`);
    }

    config.action = ActionType.getNumber(config.action);

    if (config.action == ActionType.apply) {
        let mode = getArg("-m", "--mode");

        if (isEmpty(mode)) {
            mode = ApplyMode.TestAndUpdate;
        }

        if (!ApplyMode.isValid(mode)) {
            throw new Exception(`invalid apply mode: ${mode}`);
        }

        config.applyMode = ApplyMode.getNumber(mode);
    } else if (config.action == ActionType.render) {
        config.changeset = getArg("-cs", "--changeset");

        if (isNullOrEmpty(config.changeset) && !args[2].startsWith("-")) {
            config.changeset = args[2];
        }
    } else if (config.action == ActionType.init) {
        config.initfull = args.includes("-f") || args.includes("--full");
    }

    const debugMode = args.includes("-dbm", "--debug-mode");
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

    config = merge({}, config, customConfig, { basePath })

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

    config.debugMode = debugMode;
    config.debugLevel = (getArg("-dbl", "--debug-level") || "").split("");
    config.cliMode = config.action == ActionType.init;

    return config
}

export default read;