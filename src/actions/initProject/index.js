import simpleGit from "simple-git";
import FileHelper from "../../services/FileHelper";
import initGitRepo from "./initGitRepo";
import gitignoreContent from "./gitignoreContent";
import pdcscConfigContent from "./pdcscConfigContent";
import gitlabCiContent from "./gitlabCiContent";
import commitChanges from "../../utils/commitChanges";

async function initProject(config) {
    let error;

    const { basePath } = config;

    do {
        try {
            const git = simpleGit();

            config.debug(`Checking if we are a git repo ...`);

            let hasGitRepo = await git.checkIsRepo();

            if (!hasGitRepo) {
                error = await initGitRepo(git);

                if (error) {
                    break;
                }

                hasGitRepo = true;
            } else {
                config.debug("We are in a git repo.");
            }

            const folders = [
                "Changes",
                "Data",
                "Scripts/Schemas",
                "Scripts/Types",
                "Scripts/Tables",
                "Scripts/Functions",
                "Scripts/Triggers",
                "Scripts/Views",
                "Scripts/Procedures",
                "Scripts/Relations",
                "Scripts/Indexes"
            ];

            config.debug("Creating folders ...");
            config.debug2(folders);

            folders.forEach(folder => FileHelper.createDir(basePath, folder, true));

            config.debug("Creating .gitlab-ci.yml file ...");

            const gitlabCI = FileHelper.createFile(basePath, ".gitlab-ci.yml", gitlabCiContent(), true);

            config.debug("Creating pdcsc-config.json ...");

            const pdcscConfig = FileHelper.createFile(basePath, "pdcsc-config.json", pdcscConfigContent(config), true);

            config.debug("Creating .gitignore ...");

            const gitIgnore = FileHelper.createFile(basePath, ".gitignore", gitignoreContent(), true);

            config.debug("Committing changes ...");

            error = await commitChanges([gitlabCI, pdcscConfig, gitIgnore], "pdcsc: initialized files and folders.")
        } catch (ex) { error = ex }
    } while (false);

    return error;
}

export default initProject;
