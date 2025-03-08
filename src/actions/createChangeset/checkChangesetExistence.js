import extractDateFromString from "../../utils/extractDateFromString";
import promptUser from "../../utils/promptUser";

async function checkChangesetExistence(config) {
    let changeset;
    let changesetExists = false;
    let exit = false;
    const { changesetsPath } = config.paths;
    const fileNames = fs.readdirSync(changesetsPath);
    const { currentBranch } = config;
    const regex = new RegExp(`^\\d+_${currentBranch}\\.txt$`);

    for (const fileName of fileNames) {
        if (regex.test(fileName)) {
            changesetExists = true;
            changeset = fileName;
            const existingDate = extractDateFromString(fileName);

            console.warn(`Changeset file already exists: ${changeset}`);

            if (fileNames.filter(file => file.endsWith(".sql")).some(x => extractDateFromString(x) > existingDate)) {
                do {
                    console.warn("The changeset is followed by other changesets.");

                    const userChoice = await promptUser("Modifying old changesets is not recommended. continue (y/n)? ");

                    if (userChoice === "y") {
                        break;
                    } else if (userChoice === "n") {
                        exit = true;
                        console.log("Operation canceled.");
                        break;
                    } else {
                        console.log("Invalid choice. Please enter a valid option.");
                    }
                } while (true)
            }

            break;
        }
    }

    return { changeset, changesetExists, exit };
}

export default checkChangesetExistence;