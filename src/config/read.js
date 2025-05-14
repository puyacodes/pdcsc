import fs from "fs";
import path from "path";
import { isEmpty, isNullOrEmpty, isObject } from "@locustjs/base";
import { merge } from "@locustjs/extensions-object";
import { ActionType, ApplyMode } from "../enums";
import { Exception } from "@locustjs/exception";
import chalk from "chalk";

function addDebugFunctions(config) {
    for (let i = 1; i < 10; i++) {
        config[`debug${i > 1 ? i : ''}`] = (...args) => {
            if (config.debugMode && (i == 1 || config.debugLevel.contains(`${i}`))) {
                console.log(...args);
            }
        }
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
    let applyOneByOne = false;
    let forceChangesetsTable = false;
    let fullChangeset = false;

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

    forceChangesetsTable = args.includes("-f") || args.includes("--force");

    if (action == ActionType.apply) {
        applyMode = getArg("-m", "--mode");
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
    } else if (action == ActionType.roll) {
        fullChangeset = getArg("-fc", "--full-changeset");
    }

    const cliMode = action == ActionType.init || action == ActionType.checkUpdate || action == ActionType.render;
    const renderMode = action == ActionType.roll || action == ActionType.render;
    const useMinification = renderMode && (args.includes("-m") || args.includes("--minify"));
    const useUglification = renderMode && (args.includes("-u") || args.includes("--uglify"));
    const useObfuscation = renderMode && (args.includes("-o") || args.includes("--obfuscate"));
    const debugMode = args.includes("-dbm") || args.includes("--debug-mode");
    const basePath = process.cwd();
    const server = getArg("-s", "--server");
    const user = getArg("-u", "--user");
    const password = getArg("-p", "--password");
    const dbName = getArg("-d", "--database");

    config.debugMode = debugMode;
    config.debugLevel = (getArg("-dbl", "--debug-level") || "").split("");

    addDebugFunctions(config);

    let configPath = getArg("-c", "--config");
    let customizedConfigPath;

    if (configPath) {
        configPath = path.join(basePath, configPath);

        if (!fs.existsSync(configPath)) {
            throw new Exception(`config file ${chalk.yellow(configPath)} not found.`);
        }
    } else {
        configPath = path.join(basePath, `pdcsc-config.json`);
    }

    const config_key = process.env["PDCSC_CONFIG_KEY"] || "PDCSC_CONFIG_MODE";
    let config_mode = (process.env[config_key] || '').trim();

    if (config_mode) {
        config_mode = '.' + config_mode;
        customizedConfigPath = path.join(basePath, `pdcsc-config${config_mode}.json`);
    } else {
        config.debug(`config mode ${config_key} is empty`);
    }

    let _config;

    if (fs.existsSync(configPath)) {
        _config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
    } else {
        if (!cliMode) {
            throw new Exception(`config file ${chalk.yellow(configPath)} not found.`);
        }
    }

    if (customizedConfigPath) {
        config.debug(`Reading custom config ${path.parse(customizedConfigPath).name} ...`);

        if (fs.existsSync(customizedConfigPath)) {
            customConfig = JSON.parse(fs.readFileSync(customizedConfigPath, "utf-8"));

            config.debug2(`custom config is`, customConfig);
        } else {
            if (!cliMode) {
                console.warn(chalk.yellow(`Warning: custom config file ${chalk.cyan(customizedConfigPath)} not found.`));
            }
        }
    } else {
        config.debug(`No custom config is set.`);
    }

    if (!isObject(_config)) {
        _config = {}
    }

    config.debug(`Merging config ...`);

    config = merge({}, config, _config, customConfig, {
        basePath,
        action,
        cliMode,
        applyMode,
        applyOneByOne,
        forceChangesetsTable,
        useMinification,
        useUglification,
        useObfuscation,
        fullChangeset
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

    config.database.encrypt = args.includes("-e") || args.includes("--encrypt")

    return config
}

export default read;