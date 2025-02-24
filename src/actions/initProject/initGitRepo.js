import promptUser from "../utils/promptUser";

async function initGitRepo(git) {
    let error;

    do {
        const choice = await promptUser("Would you like to initialize a git repository(Y/N)? ");

        if (choice.toLowerCase() === "y") {
            try {
                await git.init();

                console.log("Git repository initialized successfully.");
            } catch (ex) {
                error = ex;
                console.log("Initializing git repository failed");
            }

            break;
        } else if (choice.toLowerCase() === "n") {
            break;
        } else {
            console.log("Invalid choice. Please enter a valid option.");
        }
    } while (true);

    return error;
}

export default initGitRepo;
