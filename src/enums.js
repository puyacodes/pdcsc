import { Enum } from '@locustjs/enum';

const ActionType = Enum.define({
    init: 0,
    roll: 1,
    pipeline: 2,
    apply: 3,
    render: 4,
    checkUpdate: 5,
    createJournalTable: 6
}, 'ActionType');

const ApplyMode = Enum.define({
    TestAndUpdate: 0,
    Test: 1,
    Update: 2
}, 'ApplyMode');

export { ActionType, ApplyMode };