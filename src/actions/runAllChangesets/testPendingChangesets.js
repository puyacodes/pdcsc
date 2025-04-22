import { Exception } from "@locustjs/exception";
import FileHelper from "../../services/FileHelper";
import getChangesetScript from "./getChangesetScript";
import createErrorLog from "../../utils/createErrorLog";
import chalk from "chalk";

async function testPendingChangesets(config, pendingChangesets, allFiles) {
    let error;
    const scripts = {}

    console.log("Testing pending changesets ...");

    try {
        const _scripts = []
        let i = 1;

        for (let changeset of pendingChangesets) {
            let script;
            const cr = await getChangesetScript(config, changeset, allFiles, i);

            if (cr.error) {
                error = cr.error;
                break;
            } else {
                script = cr.script;

                scripts[changeset.name] = cr.script;
            }

            try {
                config.debug2(`\tTesting ...`);

                await config.db.executeBatch({ content: cr.script });

                config.debug2(chalk.green("\t\tSucceeded"));
            } catch (ex) {
                config.debug(chalk.red("\t\tFailed"));
                config.debug5({ content: cr.script });
                error = new Exception(`Testing changeset ${changeset.name} was not successful.`, ex);

                createErrorLog(config, ex);

                break;
            }

            _scripts.push(script);

            i++;
        }

        if (!error) {
            console.log("Bundling ...");

            const all = _scripts.join("\ngo\n");

            if (config.debugMode) {
                FileHelper.createFile(config.paths.scriptsPath, "all.sql", all);
            }

            console.log(`${chalk.green("Succeeded")}`);
        } else {
            console.log(`${chalk.red("Failed")}`);
        }
    } catch (ex) {
        error = new Exception("Testing pending changesets was not successful.", ex);
    }

    return { error, scripts };
}

export default testPendingChangesets;