#!/usr/bin/env node
"use strict";
import main from "./main"

main().then(({ exitCode, config }) => {
    if (config && config.debugMode) {
        console.log({ exitCode })
    }

    process.exit(exitCode)
}).catch((...args) => {
    console.error(...args);
    
    process.exit(3);
});


