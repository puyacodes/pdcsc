# pdcsc Change Log

## 2.1.28

Fixed bug: Reference error 'forceChangesetsTable' is not defined

## 2.1.29
roll: skipped new changeset deletion on errors
    let the generated script be remained, so that developer can add
    his custom script in it even if it has errors (he will surely
    resolve the errors later in next pdcsc commands and when he will
    finally push his feature branch)

apply:
    Fixed bug: get last changeset returned an incorrect changeset
    Fixed bug: changesets are not applied and app exits prematurely.
        the bug we due to an incorrect routine exit when there was no error, instead of
        exiting upon errors.
    Removed excessive test changesets succeeded/failed messages

Readme.md
    Added Best Practices and Guidelines section

## 2.1.30
roll:
    Fixed show uncommitted files output