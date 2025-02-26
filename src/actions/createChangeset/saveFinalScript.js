import getAppVersion from "./getAppVersion";
import processChangeset from "./ProcessChangeset";
import fs from "fs";

function saveFinalScript(config) {
    const { scriptTempFilePath } = config;
    const script = processChangeset(config) + `
    go
    ${getAppVersion(config)}
    go
                `;

    fs.writeFileSync(scriptTempFilePath, script, "utf-8");

    config.debug(`Script written to: ${scriptTempFilePath}`);
}

export default saveFinalScript;