import simpleGit from "simple-git";

async function commitChanges(files, message) {
    let error;
    const git = simpleGit();
    
    try {
        for (const file of files) {
            await git.add(file);
        }
    
        await git.commit(message);
    } catch (ex) {
        error = ex;
    }

    return error;
}

export default commitChanges;