import simpleGit from "simple-git";
import fs from "fs";
import path from "path";
import extractDateFromString from "../../utils/extractDateFromString";
import promptUser from "../../utils/promptUser";
import { Exception } from "@locustjs/exception";

async function generateFile(config) {
    const { changesetsPath } = config.paths;
    const { now } = config;
    const git = simpleGit();
    let userChoice;
    const fileContent = `
## ===================== Custom-Start (start) ======================
## ===================== Custom-Start ( end ) ======================

## ===================== Types (start) ======================
## ===================== Types ( end ) ======================

## ===================== Tables (start) ======================
## ===================== Tables ( end ) ======================

## ===================== Relations (start) ======================
## ===================== Relations ( end ) ======================

## ===================== Functions (start) ======================
## ===================== Functions ( end ) ======================

## ===================== SPROCs (start) ======================
## ===================== SPROCs ( end ) ======================

## ===================== Views (start) ======================
## ===================== Views ( end ) ======================

## ===================== Indexes (start) ======================
## ===================== Indexes ( end ) ======================

## ===================== Triggers (start) ======================
## ===================== Triggers ( end ) ======================

## ===================== Custom-End (start) ======================
## ===================== Custom-End ( end ) ======================
    `;

    let fileName;

    try {
        const branch = (await git.branch()).current;
        const branchName = branch.replace("/", "_");
        const files = fs.readdirSync(changesetsPath);
        let fileExists = false;
        const regex = new RegExp(`^\\d+_${branchName}\\.txt$`);

        for (const file of files) {
            if (regex.test(file)) {
                fileExists = true;
                fileName = file;
                console.warn(`Changeset file already exists in ${changesetsPath}${fileName}`);

                if (files.filter(file => file.endsWith(".sql")).some(x => (extractDateFromString(config, x)) > (extractDateFromString(config, file)))) {
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
            fs.writeFileSync(path.join(changesetsPath, fileName), fileContent.trim());
            //await git.add(`${props.config.paths.changesetFolderName}/${fileName}`);
            //await git.commit(`pdcsc: added ${fileName}.`);
        }

        return fileName;
    } catch (ex) {
        throw new Exception(`generating file ${fileName} failed`, ex);
    }
}

export default generateFile;