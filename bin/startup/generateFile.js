const simpleGit = require("simple-git");
const fs = require("fs");
const path = require("path");
const { extractDateFromString } = require("../utils/extractDateFromString");
const { promptUser } = require("../utils/promptUser");

async function generateFile(changesetPath, now, config) {
    const git = simpleGit();
    let userChoice;
    const fileContent = `
-- ===================== Custom-Start (start) ======================
-- ===================== Custom-Start ( end ) ======================

-- ===================== Types (start) ======================
-- ===================== Types ( end ) ======================

-- ===================== Tables (start) ======================
-- ===================== Tables ( end ) ======================

-- ===================== Relations (start) ======================
-- ===================== Relations ( end ) ======================

-- ===================== Functions (start) ======================
-- ===================== Functions ( end ) ======================

-- ===================== SPROCs (start) ======================
-- ===================== SPROCs ( end ) ======================

-- ===================== Views (start) ======================
-- ===================== Views ( end ) ======================

-- ===================== Indexes (start) ======================
-- ===================== Indexes ( end ) ======================

-- ===================== Triggers (start) ======================
-- ===================== Triggers ( end ) ======================

-- ===================== Custom-End (start) ======================
-- ===================== Custom-End ( end ) ======================
    `;

    try {
        const branch = (await git.branch()).current;
        const branchName = branch.replace("/", "_");
        const files = fs.readdirSync(changesetPath);
        let fileName;
        let fileExists = false;

        for (const file of files) {
            if (file.includes(branchName)) {
                fileExists = true;
                fileName = file;
                console.warn(`Changeset file already exists in ${changesetPath}${fileName}`);
                if (files.some(x => (extractDateFromString(config, x)) > (extractDateFromString(config, file)))) {
                    do {
                        console.warn("The changeset you want to modify is followed by other changesets.");
                        userChoice = await promptUser("Modifying this file might cause issues during execution later. Are you sure you want to change this file (Y/N)? ");
                        if (userChoice.toLowerCase() === "y") {
                            userChoice = true;
                            break;
                        } else if (userChoice.toLowerCase() === "n") {
                            userChoice = false;
                            throw ("Operation canceled.")
                        } else {
                            console.log("Invalid choice. Please enter a valid option.");
                        }
                    } while (true)
                }
                break;
            }
        }

        if (!fileExists) {
            fileName = `${now}_${branchName}.txt`;
            fs.writeFileSync(path.join(changesetPath, fileName), fileContent.trim());
            //await git.add(`${props.config.paths.changesetFolderName}/${fileName}`);
            //await git.commit(`Auto-Commit added ${fileName}.`);
        }

        return fileName;
    }
    catch (error) {
        throw new Error(error);
    }
}

module.exports = { generateFile }