import { isArray, isSomeArray } from "@locustjs/base";
import promptUser from "../../utils/promptUser.js";
import commitChanges from "../../utils/commitChanges.js";
import getUncommittedSqlChanges from "./getUncommittedSqlChanges.js";
import chalk from 'chalk';
import { Exception } from "@locustjs/exception";

async function getUserChoice(config) {
    let error;
    let userChoice = "1";
    let generateDrops = false;

    config.debug("Checking uncommitted sql changes ...");

    const changes = await getUncommittedSqlChanges(config);

    config.debug2({ changes });

    if (changes.all.length > 0) {
        do {
            console.warn(`
${chalk.yellow('Warning: You have uncommitted changes.')}`);

            userChoice = await promptUser(
                `\nChoose an option:
    1. Ignore
    2. Commit
    3. Show
    4. Cancel
    
Enter your choice: `);

            if (userChoice === "1") {
                break;
            } else if (userChoice === "2") {
                console.log("Committing changes...");

                error = await commitChanges(changes.all, "pdcsc: commited current changes");
                break;
            } else if (userChoice === "3") {
                const files = [];

                if (changes.modified.length > 0) {
                    files.push(chalk.whiteBright("Modified files:"));
                    files.push(...changes.modified.map(chalk.blue));
                }
                if (changes.not_added.length > 0) {
                    files.push(chalk.whiteBright("Untracked files:"));
                    files.push(...changes.not_added.map(chalk.green));
                }
                if (changes.deleted.length > 0) {
                    files.push(chalk.whiteBright("Deleted files:"));
                    files.push(...changes.deleted.map(chalk.red));
                }

                if (files.length) {
                    console.log("\nUncommitted changes:\n");
                    console.log(files.join("\n"));
                } else {
                    console.log("\nNo uncommitted changes found.");
                }
            } else if (userChoice === "4") {
                console.log("\nOperation cancelled by the user.");
                userChoice = "";
                break;
            } else {
                console.log("Invalid choice.");
            }
        } while (true);
    } else {
        config.debug("Nothing found.");
    }

    if (!isArray(changes.deleted) || userChoice == "1") {
        changes.deleted = []
    }

    // Todo
    // move out this section into index.js

    if (isSomeArray(changes.deleted) && userChoice == "2") {
        const answer = await promptUser(`\nGenerate DROP statements (y/n)? `);

        generateDrops = answer == "y";
    }

    return { userChoice, changes, generateDrops, error };
}

export default getUserChoice;