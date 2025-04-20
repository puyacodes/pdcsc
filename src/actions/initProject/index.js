import FileHelper from "../../services/FileHelper";
import initGitRepo from "./initGitRepo";
import gitignoreContent from "./gitignoreContent";
import pdcscConfigContent from "./pdcscConfigContent";
import gitlabCiContent from "./gitlabCiContent";
import commitChanges from "../../utils/commitChanges";
import azuredevopsPipelineContent from "./azuredevopsPipelineContent";

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

            config.debug("Creating .gitlab-ci.yml file ...");

            const gitlabCI = FileHelper.createFile(basePath, ".gitlab-ci.yml", gitlabCiContent(), debugMode);

            config.debug("Creating azure-pipelines.yml file ...");

            const azurePipelines = FileHelper.createFile(basePath, "azure-pipelines.yml", azuredevopsPipelineContent(), debugMode);

            config.debug("Creating pdcsc-config.json ...");

            const pdcscConfig = FileHelper.createFile(basePath, "pdcsc-config.json", pdcscConfigContent(config), debugMode);

            config.debug("Creating .gitignore ...");

            const gitIgnore = FileHelper.createFile(basePath, ".gitignore", gitignoreContent(), debugMode);

            config.debug("Committing changes ...");

            error = await commitChanges([gitlabCI, azurePipelines, pdcscConfig, gitIgnore], "pdcsc: initialized files and folders.")

            console.log("\nDone.");
        } catch (ex) { error = ex }
    } while (false);

    return error;
}

export default initProject;
