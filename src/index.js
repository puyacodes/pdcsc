#!/usr/bin/env node
"use strict";
import main from "./main"

let exitCode;

main().then(ec => { exitCode = ec }).catch(console.error);


