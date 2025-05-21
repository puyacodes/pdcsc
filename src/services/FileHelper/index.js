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
    static createFile(basePath, fileName, content) {
        let alreadyExists;
        const filePath = path.join(basePath, fileName);

        if (!fs.existsSync(filePath)) {
            fs.writeFileSync(filePath, content, "utf8");

            alreadyExists = false;
        } else {
            alreadyExists = true;
        }

        return { filePath, alreadyExists };
    }
    static createDir(basePath, folder) {
        let alreadyExists;
        const folderPath = path.join(basePath, folder);

        if (!fs.existsSync(folderPath)) {
            fs.mkdirSync(folderPath, { recursive: true });

            alreadyExists = false;
        } else {
            alreadyExists = true;
        }

        return { folderPath, alreadyExists };
    }
}

export default FileHelper;