const { foreach } = require("@locustjs/base");
const fs = require("fs");
const path = require("path");
const files = fs.readdirSync(path.join(__dirname, "."));

foreach(files, (f) => {
    // console.log(f, path.basename(f.value))
    console.log(path.basename(f.value))
    // console.log(file)
});
