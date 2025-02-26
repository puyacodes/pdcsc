import readline from "readline";

function promptUser(question, toLower = true) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            rl.close();
            
            const result = toLower ? answer.trim().toLowerCase(): answer.trim();
            
            resolve(result);
        });
    });
}

export default promptUser;