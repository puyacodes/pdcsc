import { Enum } from '@locustjs/enum';

const ActionType = Enum.define({
    createOrUpdateChangeset: 0,
    runOnPipline: 1,
    runAllChangesets: 2,
    getVersion: 3,
    init: 4,
    initfull: 5,
}, 'ActionType');

const UpdateMode = Enum.define({
    TestAndUpdate: 0,
    Test: 1,
    Update: 2
}, 'UpdateMode');

export { ActionType, UpdateMode };