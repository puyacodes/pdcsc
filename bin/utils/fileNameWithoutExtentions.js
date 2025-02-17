
function fileNameWithoutExtension(filePath) {
    const path = require("path");
    const fileNameWithoutExtension = path.basename(filePath, path.extname(filePath));
    return fileNameWithoutExtension;
}

module.exports = { fileNameWithoutExtension }
