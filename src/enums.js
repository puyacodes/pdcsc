import { Enum } from '@locustjs/enum';

const ActionType = Enum.define({
    createOrUpdateChangeset: 0,
    runOnPipline: 1,
    runAllChangesets: 2,
    getVersion: 3,
    init: 4,
    initfull: 5,
    updateTimestamp: 6
}, 'ActionType');

const UpdateMode = Enum.define({
    TestAndUpdate: 0,
    Test: 1,
    Update: 2
}, 'UpdateMode');

const DebugLevel = Enum.define({
    None: 0,
    Level1: 1,
    Level2: 2,
    Level3: 3
}, 'DebugLevel');

export { ActionType, UpdateMode, DebugLevel };