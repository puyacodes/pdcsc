import FileHelper from "../../services/FileHelper";
import initGitRepo from "./initGitRepo";
import gitignoreContent from "./gitignoreContent";
import pdcscConfigContent from "./pdcscConfigContent";
import gitlabCiContent from "./gitlabCiContent";
import commitChanges from "../../utils/commitChanges";
import azuredevopsPipelineContent from "./azuredevopsPipelineContent";
import { isFunction, isString } from "@locustjs/base";
import chalk from "chalk";

function createFile(config, name, fnContent) {
    let content = "";

    if (isFunction(fnContent)) {
        content = fnContent(config)
    } else if (isString(fnContent)) {
        content = fnContent;
    }

    const { filePath, alreadyExists } = FileHelper.createFile(config.basePath, name, content);

    if (!alreadyExists) {
        console.log(`Creating ${chalk.yellow(name)}: ${chalk.green("created")}`);
    } else {
        console.log(`Creating ${chalk.yellow(name)}: ${chalk.magenta("already exists")}`);
    }

    return filePath;
}

function createFolder(folderPath, parent, folder) {
    const { alreadyExists } = FileHelper.createDir(folderPath, folder)

    if (!alreadyExists) {
        console.log(`Creating /${chalk.yellow((parent ? parent + "/" : "") + folder)}: ${chalk.green("created")}`);
    } else {
        console.log(`Creating /${chalk.yellow((parent ? parent + "/" : "") + folder)}: ${chalk.magenta("already exists")}`);
    }
}

async function initProject(config) {
    let error;

    const { basePath, paths, folders } = config;

    do {
        try {
            error = await initGitRepo(config);

            if (error) {
                break;
            }

            console.log("");

            createFolder(basePath, "", "Scripts");

            Object.values(folders).forEach(folder => createFolder(basePath + '/' + paths.scriptsFolderName, "Scripts", folder));

            createFolder(basePath, "", "Changes");

            const gitlabCI = createFile(config, ".gitlab-ci.yml", gitlabCiContent);
            const azurePipelines = createFile(config, "azure-pipelines.yml", azuredevopsPipelineContent);
            const gitIgnore = createFile(config, ".gitignore", gitignoreContent);
            const pdcscConfig = createFile(config, "pdcsc-config.json", pdcscConfigContent);
            const dbName = config.database?.database || "MyDb";
            const customConfigDev = JSON.stringify({
                database: {
                    database: `${dbName}_dev`,
                    password: config.database?.password || "****"
                },
                masterBranchName: "origin/dev"
            }, null, 4);
            const customConfigMain = JSON.stringify({
                database: {
                    database: `${dbName}_main`,
                    password: config.database?.password || "****"
                },
                masterBranchName: "origin/main"
            }, null, 4);

            createFile(config, "pdcsc-config.development.json", customConfigDev);
            createFile(config, "pdcsc-config.production.json", customConfigMain);

            config.debug("Committing changes ...");

            error = await commitChanges([gitlabCI, azurePipelines, pdcscConfig, gitIgnore], "initialized files and folders.")

            console.log("\nDone.");
        } catch (ex) { error = ex }
    } while (false);

    return error;
}

export default initProject;
