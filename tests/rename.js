const fs = require("fs");
const path = require("path");

const _old = path.join(__dirname, "a~.txt");
const _new = path.join(__dirname, "a.txt");

try {
    fs.renameSync(_old, _new);

    console.log("renamed")
} catch (e) {
    console.error(e.message)
}