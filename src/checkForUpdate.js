import semver from "semver";
import { execSync } from "child_process";
import { name, version } from "../package.json";
import chalk from "chalk";
import { Exception } from "@locustjs/exception";

function checkForUpdate(config) {
    let error;

    try {
        console.log("Checking for pdcsc update ...\n");

        const cmd = `npm view ${name} version`;

        config.debug4("update command:", cmd);

        const latest = execSync(cmd, { encoding: "utf8" }).trim();

        if (semver.gt(latest, version)) {
            console.warn(`⚠️  Update available: ${chalk.yellow(latest)}`);
            console.log(`Run ${chalk.yellow(`npm update ${name}`)} to update.`);
        } else {
            console.log(`pdcsc is up-to-date.`);
        }
    } catch (ex) {
        error = new Exception(`Failed to check for updates`, ex);
    }

    return error;
}


export default checkForUpdate;