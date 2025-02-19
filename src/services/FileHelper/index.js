import fs from "fs";
import path from "path";

class FileHelper {
    static deleteFile(filepath) {
        if (fs.existsSync(filepath)) {
            fs.unlinkSync(filepath);
        }
    }
    static deleteFiles(...filepaths) {
        for (let filepath of filepaths) {
            FileHelper.deleteFile(filepath);
        }
    }
    static createFile(basePath, fileName, content, log = false) {
        const filePath = path.join(basePath, fileName);

        if (!fs.existsSync(filePath)) {
            fs.writeFileSync(filePath, content, "utf8");

            if (log) {
                console.log(`Created file: ${fileName}`);
            }
        }
    }
    static createDir(basePath, folder, log = false) {
        const folderPath = path.join(basePath, folder);

        if (!fs.existsSync(folderPath)) {
            fs.mkdirSync(folderPath, { recursive: true });

            if (log) {
                console.log(`Created folder: ${folder}`);
            }
        }
    }
}

export default FileHelper;