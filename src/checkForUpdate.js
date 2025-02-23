import semver from "semver";
import { execSync } from "child_process";
import { name, version } from "../package.json";

function checkForUpdate(config) {
    try {
        const currentVersion = version;
        const latest = execSync(`npm view ${name} version`, { encoding: "utf8" }).trim();

        if (semver.gt(latest, currentVersion)) {
            console.warn(`⚠️  Update available for ${name}: ${currentVersion} → ${latest}`);
            console.log(`Run "npm update ${name}" to update.`);
        } else {
            config.debug(`✅  ${name} is up-to-date! (version: ${currentVersion})`);
        }
    } catch (err) {
        console.error(`Failed to check for updates: ${err}`);
    }
}


export default checkForUpdate;