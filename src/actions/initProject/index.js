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

            let hasGitRepo = await git.checkIsRepo();

            if (!hasGitRepo) {
                error = await initGitRepo(git);

                if (error) {
                    break;
                }

                hasGitRepo = true;
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

            folders.forEach(folder => FileHelper.createDir(basePath, folder, true));

            const gitlabCI = FileHelper.createFile(basePath, ".gitlab-ci.yml", gitlabCiContent(), true);
            const pdcscConfig = FileHelper.createFile(basePath, "pdcsc-config.json", pdcscConfigContent(config), true);
            const gitIgnore = FileHelper.createFile(basePath, ".gitignore", gitignoreContent(), true);

            error = await commitChanges([gitlabCI, pdcscConfig, gitIgnore], "pdcsc: initialized files and folders.")
        } catch (ex) { error = ex }
    } while (false);

    return error;
}

export default initProject;
