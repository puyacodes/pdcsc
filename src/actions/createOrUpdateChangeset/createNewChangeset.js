import fs from "fs";
import path from "path";
import { Exception } from "@locustjs/exception";

function createNewChangeset(config) {
    try {
        const { now, currentBranch } = config;
        const content = `
## ===================== Custom-Start (start) ======================
## ===================== Custom-Start ( end ) ======================

## ===================== Schemas (start) ======================
## ===================== Schemas ( end ) ======================

## ===================== Types (start) ======================
## ===================== Types ( end ) ======================

## ===================== Tables (start) ======================
## ===================== Tables ( end ) ======================

## ===================== Relations (start) ======================
## ===================== Relations ( end ) ======================

## ===================== Functions (start) ======================
## ===================== Functions ( end ) ======================

## ===================== SPROCs (start) ======================
## ===================== SPROCs ( end ) ======================

## ===================== Views (start) ======================
## ===================== Views ( end ) ======================

## ===================== Indexes (start) ======================
## ===================== Indexes ( end ) ======================

## ===================== Triggers (start) ======================
## ===================== Triggers ( end ) ======================

## ===================== Custom-End (start) ======================
## ===================== Custom-End ( end ) ======================
`;
        //TODO: add branch hash to changesets file name
        const { changesetsPath } = config.paths;

        config.changeset = `${now}_${currentBranch}.txt`;
        config.changesetFilePath = path.join(changesetsPath, config.changeset);

        fs.writeFileSync(config.changesetFilePath, content);

        console.log(`New empty changeset ${config.changeset} created.`)
    } catch (ex) {
        throw new Exception(`generating new changeset ${config.changeset} failed`, ex);
    }
}

export default createNewChangeset;