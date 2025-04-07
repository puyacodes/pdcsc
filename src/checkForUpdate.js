import semver from "semver";
import { execSync } from "child_process";
import { name, version } from "../package.json";
import chalk from "chalk";

function checkForUpdate() {
    try {
        console.log("Checking for pdcsc update ...");

        const latest = execSync(`npm view ${name} version`, { encoding: "utf8" }).trim();

        if (semver.gt(latest, version)) {
            console.warn(`⚠️  Update available: ${chalk.yellow(latest)}`);
            console.log(`Run ${chalk.yellow(`npm update ${name}`)} to update.`);
        } else {
            console.log(`pdcsc is up-to-date.`);
        }
    } catch (err) {
        console.error(`Failed to check for updates: ${err}`);
    }
}


export default checkForUpdate;