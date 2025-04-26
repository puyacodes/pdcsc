import FileHelper from "../../services/FileHelper";
import initGitRepo from "./initGitRepo";
import gitignoreContent from "./gitignoreContent";
import pdcscConfigContent from "./pdcscConfigContent";
import gitlabCiContent from "./gitlabCiContent";
import commitChanges from "../../utils/commitChanges";
import azuredevopsPipelineContent from "./azuredevopsPipelineContent";
import fs from "fs";
import path from "path";
import { isFunction, isString } from "@locustjs/base";

function createFile(config, name, fnContent) {
    let result = path.join(config.basePath, name);

    if (!fs.existsSync(result)) {
        config.debug(`Creating ${name} file ...`);
        let content;

        if (isFunction(fnContent)) {
            content = fnContent(config)
        } else if (isString(fnContent)) {
            content = fnContent;
        }

        result = FileHelper.createFile(config.basePath, name, content, config.debugMode);
    } else {
        config.debug("already exist");
    }

    return result;
}

async function initProject(config) {
    let error;

    const { basePath, debugMode, paths, folders } = config;

    do {
        try {
            error = await initGitRepo(config);

            if (error) {
                break;
            }

            config.debug("Creating folders ...");

            Object.values(folders).forEach(folder => FileHelper.createDir(basePath + '/' + paths.scriptsFolderName, folder, debugMode));

            const gitlabCI = createFile(config, ".gitlab-ci.yml", gitlabCiContent);
            const azurePipelines = createFile(config, "azure-pipelines.yml", azuredevopsPipelineContent);
            const gitIgnore = createFile(config, ".gitignore", gitignoreContent);
            const pdcscConfig = createFile(config, "pdcsc-config.json", pdcscConfigContent);

            const customConfig = JSON.stringify({
                database: {
                    password: "****"
                }
            }, null, 4);

            createFile(config, "pdcsc-config.development.json", customConfig);
            createFile(config, "pdcsc-config.production.json", customConfig);

            config.debug("Committing changes ...");

            error = await commitChanges([gitlabCI, azurePipelines, pdcscConfig, gitIgnore], "pdcsc: initialized files and folders.")

            console.log("\nDone.");
        } catch (ex) { error = ex }
    } while (false);

    return error;
}

export default initProject;
