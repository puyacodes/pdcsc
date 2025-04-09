import { isSomeString } from '@locustjs/base';
import { Exception } from '@locustjs/exception';
import { Timestamper } from '@puya/ts';
import chalk from 'chalk';

function getAppVersion(config) {
    const appVersionSporcTemplate = isSomeString(config.appVersionSprocTemplate) ?
                    config.appVersionSprocTemplate:
                    `create or alter proc ${config.appVersionSprocName} as select '{ts}'`;
    const res = Timestamper({
        locale: `${config.timestampLocale}`,
        template: `${appVersionSporcTemplate}`,
        format: `${config.appVersionFormat}`,
        skipOutput: true
    });

    if (!res.success) {
        throw new Exception(`Timestamp using ${chalk.yellow("@puya/ts")} not generated successfully.`, res.err);
    }
    
    return res.data;
}

export default getAppVersion;