const fs = require("fs");
const path = require("path");

async function validateCommandLineArgs() {
    let configPath;
    let changesetFile;
    let changesetsTableName;
    let server;
    let config;
    let user;
    let password;
    let databaseName;
    const basePath = process.cwd();
    const args = process.argv.slice(2);
    const runOnPipline = args.includes("-rop") ? true : false;
    const runAllChangesets = args.includes("-ud") ? true : false;
    const debugMode = args.includes("-dbm") ? true : false;
    const version = args.includes("-v") ? true : false;
    const init = args.includes("-init") ? true : false;
    const initfull = args.includes("-initfull") ? true : false;

    const changesetFileArgIndex = args.indexOf("-csf");
    if (changesetFileArgIndex !== -1 && args[changesetFileArgIndex + 1]) {
        changesetFile = args[changesetFileArgIndex + 1];
    }

    const changesetsTableNameArgIndex = args.indexOf("-cht");
    if (changesetsTableNameArgIndex !== -1 && args[changesetsTableNameArgIndex + 1]) {
        changesetsTableName = args[changesetsTableNameArgIndex + 1];
        config.changesetsTableName = changesetsTableName;
    }

    const serverArgIndex = args.indexOf("-s");
    if (serverArgIndex !== -1 && args[serverArgIndex + 1]) {
        server = args[serverArgIndex + 1];
    }

    const userArgIndex = args.indexOf("-u");
    if (userArgIndex !== -1 && args[userArgIndex + 1]) {
        user = args[userArgIndex + 1];
    }

    const passwordArgIndex = args.indexOf("-p");
    if (passwordArgIndex !== -1 && args[passwordArgIndex + 1]) {
        password = args[passwordArgIndex + 1];
    }

    const databaseNameArgIndex = args.indexOf("-d");
    if (databaseNameArgIndex !== -1 && args[databaseNameArgIndex + 1]) {
        databaseName = args[databaseNameArgIndex + 1];
    }

    const configFileNameArgIndex = args.indexOf("-c");
    if (configFileNameArgIndex !== -1 && args[configFileNameArgIndex + 1]) {
        configPath = path.join(basePath, args[configFileNameArgIndex + 1]);

        if (!fs.existsSync(configPath)) {
            throw `config file ${configPath} not found.`
        }
    } else {
        configPath = path.join(basePath, "pdcsc-config.json");
    }

    if (fs.existsSync(configPath)) {
        config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
    } else {
        config = {}
    }

    const defaults = { configPath, changesetFile, basePath }
    const database = {
        databaseName: databaseName || config.database?.databaseName,
        server: server || config.database?.server,
        user: user || config.database?.user,
        password: password || config.database?.password
    }

    return { ...config, options: { runOnPipline, runAllChangesets, version, debugMode, init, initfull }, database, ...defaults }
}

module.exports = { validateCommandLineArgs }