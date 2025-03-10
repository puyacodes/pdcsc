import getAppVersion from "./getAppVersion";
import processChangeset from "./processChangeset";
import fs from "fs";

async function saveFinalScript(config) {
    const { scriptTempFilePath } = config;
    const script = await processChangeset(config) + `
go
${getAppVersion(config)}
go
`;

    fs.writeFileSync(scriptTempFilePath, script, "utf-8");

    config.debug(`Script written to: ${scriptTempFilePath}`);
}

export default saveFinalScript;