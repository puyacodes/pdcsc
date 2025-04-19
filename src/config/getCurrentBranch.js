import { execSync } from "child_process";
import { ActionType } from "../enums";

function getCurrentBranch(config) {
    let currentBranch;
    let realBranchName;

    if (config.action == ActionType.pipline) {
        if (config.pipeline === "gitlabs") {
            if (process.env.CI_COMMIT_REF_NAME) {
                currentBranch = process.env.CI_COMMIT_REF_NAME.trim().replace("/", "-");
            }
            
            realBranchName = process.env.CI_COMMIT_REF_NAME;
        } else if (config.pipeline === "azuredevops") {
            if (process.env.CI_COMMIT_REF_NAME) {
                currentBranch = process.env.CI_COMMIT_REF_NAME.trim().replace("/", "-");
            }

            realBranchName = process.env.CI_COMMIT_REF_NAME;
        }
    } else {
        currentBranch = execSync("git rev-parse --abbrev-ref HEAD", { encoding: "utf-8" }).trim().replace("/", "-");
        realBranchName = execSync("git rev-parse --abbrev-ref HEAD", { encoding: "utf-8" }).trim();
    }

    return { currentBranch, realBranchName }
}

export default getCurrentBranch;