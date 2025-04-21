import fs from "fs";
import path from "path";

function getAllSqlFiles(config, dir, level = 0) {
    let result = [];

    if (level == 0) {
        config.debug("Getting all .sql files ...");
    }

    if (fs.existsSync(dir)) {
        const list = fs.readdirSync(dir);

        list.forEach((file) => {
            const fullPath = path.join(dir, file);
            const stat = fs.statSync(fullPath);

            if (stat && stat.isDirectory()) {
                result = result.concat(getAllSqlFiles(config, fullPath, level + 1));
            } else if (fullPath.toLowerCase().endsWith(".sql")) {
                result.push(fullPath);
            }
        });
    }

    if (level == 0) {
        config.debug("Total .sql files = ", result.length);
    }

    return result;
}

export default getAllSqlFiles;