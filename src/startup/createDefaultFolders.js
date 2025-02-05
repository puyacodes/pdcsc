const fs = require("fs");
const path = require("path");
const simpleGit = require("simple-git");
const { promptUser } = require("../utils/promptUser");
let userChoice;

async function createDefaultFolders(config) {
    try {
        const git = simpleGit();
        const hasGitRepo = await git.checkIsRepo();

        if (!hasGitRepo) {
            userChoice = await handleUserChoice(git);
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

        folders.forEach(folder => {
            const folderPath = path.join(config.basePath, folder);
            if (!fs.existsSync(folderPath)) {
                fs.mkdirSync(folderPath, { recursive: true });
                console.log(`Created folder: ${folder}`);
            }
        });

        createFile(".gitlab-ci.yml", gitlabCiContent(), config.basePath);
        createFile("pdcsc-config.json", pdcscConfigContent(config), config.basePath);
        if (!hasGitRepo && userChoice.toLowerCase() === "y") {
            createFile(".gitignore", gitignoreContent(), config.basePath, true, git);
        }

    } catch (error) {
        throw new Error(error.message);
    }
}

async function handleUserChoice(git) {
    do {
        userChoice = await promptUser("Would you like to initialize a git repository(Y/N)? ");
        if (userChoice.toLowerCase() === "y") {
            try {
                await git.init();
                console.log("Git repository initialized successfully.");
            } catch (error) {
                throw new Error(`Error during initializing git repository: ${error.message}`);
            }
            break;
        } else if (userChoice.toLowerCase() === "n") {
            break;
        } else {
            console.log("Invalid choice. Please enter a valid option.");
        }
    } while (true);

    return userChoice;
}

function createFile(fileName, content, basePath, commit, git) {
    const filePath = path.join(basePath, fileName);
    if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, content, "utf8");
        console.log(`Created file: ${fileName}`);
    }
    if (commit) {
        git.add(filePath);
        git.commit("Auto-Commit: initialized files and folders.");
    }
}

function pdcscConfigContent(config) {
    const configContent = {
        database: {
            server: "",
            user: "",
            password: "",
            databaseName: ""
        }
    };
    if (config.options.initfull) {
        configContent.pipeline = "gitlabs";
        configContent.paths = {
            backupDir: "C:\\temp\\",
            changesetFolderName: "Changes",
            scriptsFolderName: "Scripts",
            appVersionFormat: "YYYY-MM-DD HH:mm:ss",
            timestampLocale: "en",
            masterBranchName: "origin/dev",
            changesetsTableName: "Changesets"
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
    - pdcsc -rop
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

# NuGet Packages
*.nupkg
**/[Pp]ackages/*
!**/[Pp]ackages/build/

# Microsoft Azure
csx/
*.build.csdef

# Generated scripts
/Scripts/Indexes.sql
/Scripts/Relations.sql
/Scripts/Schemas.sql
/Scripts/Types.sql
/Scripts/Tables.sql
/Scripts/Triggers.sql
/Scripts/Procedures.sql
/Scripts/Functions.sql
/Scripts/Views.sql
/Scripts/ViewsAndFunctions.sql

# Logs and backups
/Changes/error.log`;
}

module.exports = { createDefaultFolders };
