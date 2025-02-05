const { promptUser } = require("../utils/promptUser.js");
const { validateChangedFiles } = require("../validations/validateChangedFiles.js");
const { getAllStatuses } = require("../utils/getAllStatuses.js");
const chalk = require('chalk');

async function getUserChoice(status, folders, config) {
    const uncommittedChanges = [];
    let userChoice;

    do {
        await validateChangedFiles({
            status: await getAllStatuses({ status, config }),
            listName: uncommittedChanges,
            commit: false,
            folders,
            config
        });

        if (uncommittedChanges.length > 0) {
            console.warn(
                "Warning: You have uncommitted changes. Only committed changes will be included in the script."
            );
            userChoice = await promptUser(
                "Choose an option:\n1. Ignore changes and continue\n2. Commit changes and continue\n3. Show uncommitted changes.\n4. Cancel\nEnter your choice: "
            );

            if (userChoice === "1") {
                console.log("Ignoring changes and continuing...");
                break;
            } else if (userChoice === "2") {
                console.log("Committing changes...");
                await validateChangedFiles({
                    status: await getAllStatuses({ status, config }),
                    listName: null,
                    commit: true,
                    folders,
                    config
                });
                break;
            } else if (userChoice === "3") {
                uncommittedChanges.length = 0;
                if (status.modified.length > 0) {
                    uncommittedChanges.push(chalk.blue("Modified files:"));
                    validateChangedFiles({
                        status: status.modified,
                        listName: uncommittedChanges,
                        commit: false,
                        folders,
                        config
                    });
                }
                if (status.not_added.length > 0) {
                    uncommittedChanges.push(chalk.green("Untracked files:"));
                    validateChangedFiles({
                        status: status.not_added,
                        listName: uncommittedChanges,
                        commit: false,
                        folders,
                        config
                    });

                }
                if (status.deleted.length > 0) {
                    uncommittedChanges.push(chalk.red("Deleted files:"));
                    validateChangedFiles({
                        status: status.deleted,
                        listName: uncommittedChanges,
                        commit: false,
                        folders,
                        config
                    });
                }

                if (uncommittedChanges.length > 0) {
                    console.log("Uncommitted changes:");
                    console.log(uncommittedChanges.join("\n"));
                } else {
                    console.log("No uncommitted changes found.");
                }

            } else if (userChoice === "4") {
                // if (!fs.existsSync(scriptFilePath)) {
                //     fs.unlinkSync(changesetFilePath);
                // };
                console.log("Operation cancelled by the user.");
                process.exit(0);
            } else {
                console.log("Invalid choice. Please enter a valid option.");
            }
        } else {
            userChoice = "1";
            break;
        }
    } while (true);

    return userChoice;
}

module.exports = { getUserChoice }