import { isSomeString } from '@locustjs/base';
import { Exception } from '@locustjs/exception';
import { Timestamper } from '@puya/ts';
import chalk from 'chalk';

function getAppVersion(config, changesetName) {
    const template = isSomeString(config.appVersionSprocTemplate) ?
        config.appVersionSprocTemplate :
        `create or alter proc ${config.appVersionSprocName} as select '{ts}' as applyDate, {changesetName} as changeset`;
    const res = Timestamper({
        locale: `${config.timestampLocale}`,
        template: template.replace('{changesetName}', changesetName),
        format: config.appVersionFormat,
        skipOutput: true
    });

    if (!res.success) {
        throw new Exception(`Timestamp using ${chalk.yellow("@puya/ts")} not generated successfully.`, res.err);
    }

    return res.data;
}

export default getAppVersion;