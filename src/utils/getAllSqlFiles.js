import fs from "fs";
import path from "path";

function getAllSqlFiles(dir) {
    let result = [];

    if (fs.existsSync(dir)) {
        const list = fs.readdirSync(dir);

        list.forEach((file) => {
            const fullPath = path.join(dir, file);
            const stat = fs.statSync(fullPath);

            if (stat && stat.isDirectory()) {
                result = result.concat(getAllSqlFiles(fullPath));
            } else if (fullPath.toLowerCase().endsWith(".sql")) {
                result.push(fullPath);
            }
        });
    }

    return result;
}

export default getAllSqlFiles;