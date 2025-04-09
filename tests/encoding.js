import fs from "fs";
import path from "path";
import detectEncoding from "detect-file-encoding-and-language";
import { Exception } from "@locustjs/exception";
import iconv from 'iconv-lite';
import chalk from "chalk";

async function getEncoding(filepath) {
    // const fileName = path.basename(filePath);
    const info = await detectEncoding(filepath);
    let result = (info.encoding || "").toLowerCase().replace("-", "");

    if (result == "utf8") {
        result = "utf-8";
    }
    if (!result) {
        result = "latin1";
    }
    if (["utf-8", "utf16le", "ascii", "latin1"].indexOf(result) < 0) {
        throw new Exception(`Unsupported encoding ${chalk.yellow(result)} (${info.encoding})`);
    }

    return result;
}

function getFiles(dir) {
    let results = [];
    const list = fs.readdirSync(dir);

    list.forEach((file) => {
        const fullPath = path.join(dir, file);

        if (fullPath.endsWith(".sql")) {
            results.push(fullPath);
        }
    });

    return results;
}

async function run() {
    const all = []
    const files = getFiles(path.join(__dirname, "sample-encoding"));

    for (let file of files) {
        const info = await detectEncoding(file);

        let encoding;
        let content;

        try {
            let encodingError = false;
            try {
                encoding = await getEncoding(file);
            } catch (e) {
                encoding = e;
                encodingError = true;
            }

            console.log({ file, deteced: encoding.toString(), ...info })

            if (!encodingError) {
                content = fs.readFileSync(file, encoding);

                if (encoding == "latin1") {
                    const bytes = fs.readFileSync(file, "binary");
                    content = iconv.decode(bytes, 'windows-1256');
                }
            }
        } catch (e) {
            content = "ERROR reading file " + e
        }

        content = path.basename(file) + ":\t\t" + encoding + "\n" + content + "\n---------------------------------------";

        all.push(content)
    }

    fs.writeFileSync(path.join(__dirname, "all.sql"), all.join("\n"), "utf-8")

    console.log("done");
}

run()