import fs from "fs";
import path from "path";
import { isObject } from "@locustjs/base";
import { merge } from "@locustjs/extensions-object";
import { ActionType } from "../enums";
import { DbHelperSqlServer } from "../services/DbHelper";

async function validateCommandLineArgs(args) {
    function getArg(arg) {
        const index = args.indexOf(arg);
        const result = index >= 0 ? args[index + 1] : undefined;

        return result;
    }

    let config;
    let customConfig;
    const basePath = process.cwd();
    const changesetFile = getArg("-cs");
    const server = getArg("-s");
    const user = getArg("-u");
    const password = getArg("-p");
    const database = getArg("-d");
    let configPath = getArg("-c");
    let customizedConfigPath;

    if (configPath) {
        configPath = path.join(basePath, configPath);

        if (!fs.existsSync(configPath)) {
            throw `config file ${configPath} not found.`
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

    const defaults = { configPath, changesetFile, basePath }
    const database = {
        database,
        server,
        user,
        password
    }

    config = merge({}, { database }, config, customConfig, defaults)

    if (args.includes("-rop")) {
        config.action = ActionType.runOnPipline;
    } else if (args.includes("-ud")) {
        config.action = ActionType.runAllChangesets;
    } else if (args.includes("-v")) {
        config.action = ActionType.getVersion;
    } else if (args.includes("-init")) {
        config.action = ActionType.init;
    } else if (args.includes("--init-full")) {
        config.action = ActionType.initfull;
    } else {
        config.action = ActionType.createChangeset;
    }

    return config
}

export default validateCommandLineArgs;