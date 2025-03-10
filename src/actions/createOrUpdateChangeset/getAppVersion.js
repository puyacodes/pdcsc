import { isSomeString } from '@locustjs/base';
import { Exception } from '@locustjs/exception';
import { Timestamper } from '@puya/ts';

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
        throw new Exception(`ts not generated successfully.`, res.err);
    }
    
    return res.data;
}

export default getAppVersion;