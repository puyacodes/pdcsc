const { execSync } = require("child_process");
const semver = require("semver");
const packageJson = require("../../package.json");

async function checkForUpdate(config) {
    try {
        const currentVersion = packageJson.version;
        const latest = execSync(`npm view ${packageJson.name} version`, { encoding: "utf8" }).trim();

        if (semver.gt(latest, currentVersion)) {
            console.warn(`⚠️  Update available for ${packageJson.name}: ${currentVersion} → ${latest}`);
            console.log(`Run "npm update ${packageJson.name}" to update.`);
        } else {
            if (config.options.debugMode) {
                console.log(`✅  ${packageJson.name} is up-to-date! (version: ${currentVersion})`);
            }
        }
    } catch (error) {
        console.error(`Failed to check for updates: ${error.message}`);
    }
}


module.exports = { checkForUpdate }