
function fileNameWithoutExtension(filePath) {
    const path = require("path");
    const result = path.basename(filePath, path.extname(filePath));

    return result;
}

export default fileNameWithoutExtension;
