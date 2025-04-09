import fs from "fs";
import path from "path";
import { Exception } from "@locustjs/exception";
import getNewChangeset from "./getNewChangeset";
import chalk from "chalk";

function createNewChangeset(config) {
    let changeset;
    let changesetFilePath;

    try {
        const cs = getNewChangeset(config);

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
        changeset = cs.changeset;
        changesetFilePath = cs.changesetFilePath;

        fs.writeFileSync(changesetFilePath, content);

        console.log(`New changeset ${path.parse(changeset).name} created.`)
    } catch (ex) {
        throw new Exception(`Generating new changeset ${chalk.cyan(changeset)} failed`, ex);
    }

    return { changeset, changesetFilePath }
}

export default createNewChangeset;