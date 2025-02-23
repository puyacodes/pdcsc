import { Timestamper } from '@puya/ts';

function getAppVersion(config) {
    const appVersionSporcTemplate = `create or alter proc ${config.appVersionSprocName} as select '{ts}'`;
    const res = Timestamper({
        locale: `${config.timestampLocale}`,
        template: `${appVersionSporcTemplate}`,
        format: `${config.appVersionFormat}`,
        skipOutput: true
    });

    if (!res.success) {
        console.warn(`ts not generated successfully.`);
        console.warn(`${JSON.stringfy(res.err)}`);
    }
    return res.data;
}

export default getAppVersion;