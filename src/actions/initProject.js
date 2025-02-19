import simpleGit from "simple-git";
import promptUser from "../utils/promptUser";
import { GitInitException } from "../exceptions"
import FileHelper from "../services/FileHelper";

async function initProject(config) {
    const git = simpleGit();

    let hasGitRepo = await git.checkIsRepo();

    if (!hasGitRepo) {
        await initGitRepo(git);

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

    FileHelper.createFile(config.basePath, ".gitlab-ci.yml", gitlabCiContent(), true);
    FileHelper.createFile(config.basePath, "pdcsc-config.json", pdcscConfigContent(config), true);

    if (hasGitRepo) {
        FileHelper.createFile(config.basePath, ".gitignore", gitignoreContent(), true);

        git.add(filePath);
        git.commit("pdcsc: initialized files and folders.");
    }
}

async function initGitRepo(git) {
    do {
        const choice = await promptUser("Would you like to initialize a git repository(Y/N)? ");

        if (choice.toLowerCase() === "y") {
            try {
                await git.init();

                console.log("Git repository initialized successfully.");
            } catch (err) {
                throw new GitInitException(err);
            }

            break;
        } else if (choice.toLowerCase() === "n") {
            break;
        } else {
            console.log("Invalid choice. Please enter a valid option.");
        }
    } while (true);
}

function pdcscConfigContent(config) {
    const configContent = {
        database: {
            server: ".",
            user: "sa",
            password: "****",
            databaseName: "mydb"
        }
    };

    if (config.options.initfull) {
        configContent.pipeline = "gitlabs";
        configContent.masterBranchName = "origin/main",
        configContent.appVersionFormat = "YYYY-MM-DD HH:mm:ss",
        configContent.timestampLocale = "en";
        configContent.changesetsTableName = "Changesets";
        configContent.backupDbName = "TempBackupDB";
        configContent.paths = {
            backupDir: "C:\\temp\\",
            changesetFolderName: "Changes",
            scriptsFolderName: "Scripts",
        }
        configContent.folders = {
            Procedures: "Procedures",
            Functions: "Functions",
            Tables: "Tables",
            Relations: "Relations",
            Types: "Types",
            Views: "Views",
            Indexes: "Indexes",
            Triggers: "Triggers",
            Schemas: "Schemas"
        }
        configContent.appVersionSprocName = "dbo.getAppVersion"
    }
    
    return JSON.stringify(configContent, null, 4);
}

function gitlabCiContent() {
    return `stages:
  - build

variables:
  GIT_DEPTH: 0

before_merge_build:
  stage: build
  image: node:alpine
  script:
    - echo "Installing dependencies..."
    - npm i @puya/pdcsc -g
    - apk update && apk add git
    - |
      if [ "$CI_MERGE_REQUEST_SOURCE_BRANCH_NAME" = "dev" ] || [ "$CI_MERGE_REQUEST_SOURCE_BRANCH_NAME" = "main" ]; then
        pdcsc -ud -dbm -c "pdcsc-config.$\{CI_MERGE_REQUEST_TARGET_BRANCH_NAME\}.json"
      else
        pdcsc -rop -dbm -c "pdcsc-config.$\{CI_MERGE_REQUEST_TARGET_BRANCH_NAME\}.json"
      fi
  rules:
    - when: manual`;
}

function gitignoreContent() {
    return `# SQL Server files
*.mdf
*.ldf
*.ndf

# User-specific files
*.rsuser
*.suo
*.user
*.userosscache
*.sln.docstates

# User-specific files (MonoDevelop/Xamarin Studio)
*.userprefs

# Visual Studio cache files
.vs/

# Node.js
node_modules/

# Dist and publish
/dist
/publish

# Microsoft Azure
csx/
*.build.csdef

# Logs and backups
/Changes/error.log`;
}

export default initProject;
