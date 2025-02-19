import { Enum } from '@locustjs/enum';

const ActionType = Enum.define({
    createChangeset: 0,
    runOnPipline: 1,
    runAllChangesets: 2,
    getVersion: 3,
    init: 4,
    initfull: 5
}, 'ActionType');

export { ActionType };