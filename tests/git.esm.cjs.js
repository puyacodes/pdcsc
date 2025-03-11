'use strict';

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var simpleGit = _interopDefault(require('simple-git'));

async function c1() {
    console.log(`checking if we are in a git repo ...`);
    
    const git = simpleGit();

    let isRepo = false;

    try {
        isRepo = await git.checkIsRepo();
    } catch (ex) {
    }

    console.log({ isRepo });
}

c1().catch(console.log);
