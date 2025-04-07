import { Exception } from "@locustjs/exception";
import { execSync } from "child_process";

function restoreCommittedChanges(num) {
    const command = `git reset --mixed HEAD~${num ?? 1}`

    try {
        execSync(
            command,
            { encoding: "utf-8" }
        ).trim();

        console.log("   commited changes are restored back.");
    } catch (error) {
        throw new Exception("ERROR!! RESTORING COMMITTED CHANGES FAILED.\nYOU MUST RESTORE CHANGES MANUALLY.\n\n" + command, error)
    }
}

export default restoreCommittedChanges;