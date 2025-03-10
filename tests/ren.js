const fs = require("fs");
const path = require("path");

function start() {
    const file1 = path.join(__dirname, "a.txt");
    const file2 = path.join(__dirname, "b.txt");

    try {
        console.log(`renaming ${file1} to ${file2}`)
        fs.renameSync(file1, file2);
    } catch (error) {
        console.log(error.message)
    }
}

start()