# pdcsc Change Log

## 2.1.28

Fixed bug: Reference error 'forceJournalTable' is not defined

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

## 2.1.31
    Fixed custom config reading
    Fixed database existence checking
    Added more debug levels
        Used debug level 6 for config, debug level 9 for stack trace
    Fixed conncetion error in DbHelperSqlServer

## 2.1.32
    Fixed 'Skipped changeset testing'
        changes were skipped when the changeset didn't change, but changeset file changed

## 2.1.33
    init:
        Updated gitlab-ci.yml
        Update azure-pipelines.yml

## 2.1.34
    roll
        Fixed bug: Unexpected changeset .sql file not found.

## 2.1.35
    roll
        Fixed bug: Array.contains() returned true for incorrect items

## 2.1.36
    merge
        Fixed bug: changeset is never executed on merging PRs

# 2.1.37
    merge
        Fixed bug: changeset is not journaled after being executed on database

# 2.1.38
    Added debug level 7: deep variables (rarely used)
    used debug level 7
        showing extracted changeset timestamp
        show merged sections before finalizing render script

# 2.1.39
    Updated readme

# 2.1.40
    init
        Fixed issue: creatd Changes folder in the init process

# 2.1.41
    merge
        Fixed bug: Invalid object name 'Changesets' (on new empty databases)

# 2.1.42
    merge
        Fixed bug: -f arg is not applied

# 2.2.0
    roll
        applied major changes.
        removed rolling back committed changes due to various bugs.
        enhanced script comparison to avoid testing not-changed scripts.

# 2.3.0
    made changeset template content more flexible

# 2.3.2
    apply
        fixed bug in getting pending changesets

# 2.3.3
    apply
        fixed bug: "Cannot access 'c' before initialization"
        
# 2.4.0
    added journal command

# 2.4.1
    init
        removed -f arg from gitlab-ci init file
        improved readme

# 2.4.2
    init
        improved functionality & output
    roll
        fixed issue: changeset is tested even though it is not required to be tested or
                    when database versioning is customized.

# 2.4.3
    roll
        fixed bug: added redundant section upon meeting empty sections
    apply
        fixed bug: changeset execution order is corrupted
        fixed bug: missing bundle file (all.sql) content in debug mode and update mode
        fixed issue: 

    added connection timeout and query timeout options for database config

# 2.4.4
    fixed connection timeout/query timeout

# 2.4.5
    apply
        fixed bug: assignment to constant variable

# 2.4.6
    roll
        fixed bug: renamed items are not added to changeset
        fixed issue: custom sections in rendered script are trimmed
        fixed issue: added not .sql deleted files to changes
        fixed finalDeleteds reporting in debug mode
        used level 7 reporting for chnageset timestamp extraction
        
# 2.4.7
    fixed bug: ReferenceError: isSectionEnd is not defined

# 3.0.0
    renamed `pipeline` command to `merge`
    enhanced shell exec by introducing config.exec()
    added new missing db objects drop statements
    added config.debug1() function
    used level 1 debug messages for better debugging without going to level 2

    apply
        added `-ip` or `--in-pipeline` argument

# 3.0.1
    roll
        fixed auto pull/merge