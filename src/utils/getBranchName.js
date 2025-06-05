import { ActionType } from "../enums";

function getBranchName(config) {
    let currentBranch;
    let realCurrentBranch;
    let targetBranch;
    let realTargetBranch;

    if (config.action == ActionType.merge) {
        if (config.pipeline === "gitlabs") {
            if (process.env.CI_COMMIT_REF_NAME) {
                realCurrentBranch = process.env.CI_COMMIT_REF_NAME.trim();
            }
            if (process.env.CI_MERGE_REQUEST_TARGET_BRANCH_NAME) {
                realTargetBranch = process.env.CI_MERGE_REQUEST_TARGET_BRANCH_NAME.trim();
            }
        } else if (config.pipeline === "azuredevops") {
            if (process.env.BUILD_SOURCEBRANCHNAME) {
                realCurrentBranch = process.env.BUILD_SOURCEBRANCHNAME.trim();
            }
            if (process.env.SYSTEM_PULLREQUEST_TARGETBRANCH) {
                realTargetBranch = process.env.SYSTEM_PULLREQUEST_TARGETBRANCH.trim();
            }
        } else {
            console.log(`Invalid pipeline type ${config.pipeline}`);
        }
    } else {
        realCurrentBranch = config.exec("git rev-parse --abbrev-ref HEAD");
    }

    currentBranch = realCurrentBranch ? realCurrentBranch.replace("/", "-") : "";
    targetBranch = realTargetBranch ? realTargetBranch.replace("/", "-") : "";

    return { currentBranch, realCurrentBranch, targetBranch, realTargetBranch }
}

export default getBranchName;