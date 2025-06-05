import { Exception } from "@locustjs/exception";

function restoreCommittedChanges(config, num) {
    try {
        config.debug1(` resttoring committed changes ${num} level(s) back ...`)
        config.exec(`git reset --mixed HEAD~${num ?? 1}`);

        console.log("   commited changes are restored back.");
    } catch (error) {
        throw new Exception("ERROR!! RESTORING COMMITTED CHANGES FAILED.\nYOU MUST RESTORE CHANGES MANUALLY.\n\n" + command, error)
    }
}

export default restoreCommittedChanges;