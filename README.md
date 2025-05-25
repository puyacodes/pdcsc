# PDCSC - Puya Data Changeset Creator

# License

This tool is licensed under MIT License - see the [LICENSE](LICENSE) file for details.

# Introduction

`@puya/pdcsc` or in short `pdcsc` is a CLI tool developed in `nodejs` for managing `.sql` database repositories that target `Microsoft` `SQL Server` databases.

It creates/updates changeset files based on `.sql` files' changes detected in feature branches in a `./Scripts` folder.

The tool can be integrated in cicd pipelines like `gitlab pipeline` and `azurdevops pipeline` and is also able to apply changeset(s) on custom databases upon merging branches.

Last but not least, `pdcsc` can also be used manually to update a custom database by applying changesets on it, making the database up-to-date with the lastest changes of the project. Thus, `pdcsc` can be a handy tool for support teams as well.

# What does `pdcsc` mean?
It is an acronym for `Puya Data Changeset Creator`. `Puya` is a `persian` word (`پویا`), meaning `dynamic`.

It means a tool that creates changesets for dynamic data or dynamic databases.

# What does `pdcsc` do?
- It manages a database repository containing `.sql` files.
- It targets database schema management, not the data inside of a database.
- It creates changeset scripts for modifications developers do in their feature branches.
- It assists in having a smooth and streamlined ci/cd workflow to update database of a product/project.
- It provides a safe, smooth and automated mechanism to apply schema updates on `SQL Server` databases.
- It is a tool best used in teams, but can be used by single developers as well.

# What does not `pdcsc` do?
- It does not merge `.sql` files and generate a single bundle for creating the database (together with all its objects).
- It dos not work in an `Up/Down` fashion. It always works in an `Up` fashion.
- It does not have anything to do with a project's business logic.

# Why not `Up/Down`?
Lets accept this. Most of the time we are going `Up`. We go `Down` mostly in case of errors.

Going back is in reality a dangerous and daunting happening. It can lead to data loss.

The way `pdcsc` works together with proper ci/cd scripts ensures that database is updated without any errors - most of the time if not always.

If we always go up step by step and we are safe in each step, there should not be a need to go down - in theory.

If something failed, we can issue a hotfix and apply the fix immediately to counter the bug.

Again, we are going up in order to resolve and fix the issue.

# Features

- **Generate Changeset**: generates changeset based on committed changes detected in a branch.
- **Test Changeset**: creates a database backup and executes the changeset against that to see whether the changeset is ok or not.
- **Pipeline Mode**: Using `pipeline` argument, it can be used in `ci/cd pipelines` (like `gitlab` or `azuredevops`) to provide a safe merge, preventing the merge if the changeset has errors.
- **Update database**: Using `apply` argument, it can apply changesets(s) on a database and making the database up-to-date.

By default (without specifying `pipeline` or `apply` arguments), `@puya/pdcsc` manages current branch's changeset.

# Disclaimer
`@puya/pdcsc` IS AN IMPORTANT AND CRITICAL TOOL THAT TARGETS SQL SERVER DATABASES.

THE TOOL NEVER CHANGES ANY DATA IN TARGET DATABASES EXCEPT THE TABLE IT CREATES ITSELF TO TRACK CHANGESETS JOURNALING.

THE TOOL NEVER MANIPULATES ANY SCHEMA IN TARGET DATABASES. ALL SCHEMA CHANGES ARE PERFORMED BY DEVELOPERS WHO USE THE COMMAND AND PUT THEIR CUSTOM SCRIPTS IN THE CHANGESETS.

IT IS HIGHLY RECOMMENDED TO HAVE A DBA IN YOUR TEAM WHO PERFORMS CODE REVIEW UPON FEATURE BRANCH MERGING AND IS COMPLETELY SURE ABOUT THE CHANGES APPLYING TO YOUR DATABASES.

THIS TOOL IS DEVELOPED AS IS AND THE COMPANY AND DEVELOPERS WHO CREATED IT HAVE NO RESPONSIBILITY OVER ANY PROBLEMS HAPPEN OR CONSEQUENCES INCUR TO YOUR DATABASES.

YOU USE IT SOLELY BASED ON YOUR OWN DECISION.

PLEASE DO READ THE `Best Practices and Guidelines` SECTION OF THIS DOCUMENT TO FOLLOW BEST PRACTICES AND GUIDELINES.

# Installation
## Global

```bash
npm i @puya/pdcsc -g
```

## Local

```bash
npm install @puya/pdcsc
```

# Current Version
```
2.4.2
```

# Usage

Once installed, you can use the `pdcsc` command in your terminal. You should run this tool only in the root of your database's scripts repository.

```bash
pdcsc [cmd] [arguments] [options]
```

# Requirements
- `pdcsc` requires `git` to be installed on the machine where it is run.
- It must also be executed in a `git` repository.
- There should be a `Scripts` folder where `pdcsc` executes.
- In `./Scripts` folder, script files of `SQL Server` objects are expected to be stored.
- `pdcsc` config files should be placed near the `Scripts` folder.
- For `pipeline` and `apply` commands, `pdcsc` requires a ci/cd tool like `gitlabs` or `azuredevops`.

# Recommendations
`pdcsc` does not enforce any rules for file names and their content.
Nevertheless, while the following rules are not obligatory for `pdcsc`, it is recommended to employ them in your database repository to have a smooth database maintenance.

- Put `Scripts` folder at the root of the repo.
- Each object (`table`, `udf`, `sproc`, etc.) must be stored as a distinct `.sql` file.
- Include schema of the object in the filename (use `dbo.MyTbl.sql` not `MyTbl.sql`)
- Each file should only create a single object.
- Name of the file should match the object name.
- File of tables should include default constriants as well, but not foreign keys.
- Definition of all foreign keys of a table must be put in a distinct file in `Relations` folder.
- The filename of FK relations of a table should be the same name as table name. The reason behind this is explained at `Why Tables and Relations are separated` section.
- Any custom command to should be placed in especial `Custom-Start`/`Custom-End` sections provided in changesets.
- Make your changesets idempotent by adding enough custom start/end scripts (i.e. if they are executed multiple times, no error is raised and no side-effect is happened). Read `Idempotent Changeset` section about idempotent changesets.

# Main commands

- `init`: Initializes a new database repository in current path, creates a git repo in it (if no git repo found), creates default scripts folders and creates a `pdcsc-config.json` config file and gitlab ci/cd yaml file.
- `roll`: Creates/Updates a changeset based on `.sql` file changes in `./Scripts` folder in current branch. This is the default command.
- `apply`: Applies changesets in `./Changes` folder on a database (updates the database).
- `pipeline`: Used in CICD pipelines, tests changeset of current branch that its merge is requested and if it succeeds, executes changeset over the database specified (making it up-to-date). If changeset execution was successful as well, it  is journaled in the database (journaling is explained later in `Changeset execution history` section).
- `render`: Renders a changeset and creates a `.sql` file (overwrites existing `.sql` file)
- `check-update`: checks whether a new version for `pdcsc` is available or not.
- `create-journal`: creates journal table (`dbo.Changesets` if it is not already exist).

# CLI arguments

- `-v` or `--version`: Shows pdcsc version.
- `-?` or `--help`: Shows pdcsc help.
- `-c` or `--config`: specifying custom config file
- `-fc` or `--full-changeset`: create full changeset (containing all sections)
- `-s` or `--server`: database server address.
- `-u` or `--user`: database user.
- `-p` or `--password`: database password.
- `-d` or `--database`: target database.
- `-e` or `--encrypt`: encrypt database connection or not (default is `false`).
- `-dbm` or `--debug-mode`:	debug mode
- `-dbl` or `--debug-level`:	debug level

**Note**: `-s`, `-u`, `-p`, `-d` and `-e` cli args have more priority over same database props in `pdcsc-config.json`.

## Debug Levels
- `1`: log app execution flow (default)
- `2`: show local variables
- `3`: show loop variables and more detailed variables
- `4`: show db queries
- `5`: show large db queries
- `6`: show used pdcsc-config
- `7`: show deepest variables (rarely used)
- `8`: resered
- `9`: show detailed exceptions and errors (expanded stack trace)

# Examples

1. Initializing a new database repository:

```bash
pdcsc init
```

Initializing a new database repository with full config:

```bash
pdcsc init -f
```

2. Creating/Updating current feature branch's changeset:

```bash
pdcsc roll
```

or simply ...

```bash
pdcsc
```

3. Updating master database upon merge requests in CI/CD:

```bash
pdcsc pipeline
```

4. Manually updating an existing database

```bash
pdcsc apply -d MyDb
```

5. Specifying database setting through cli:

```bash
pdcsc -s "192.168.10.120" -u "myUser" -p "myPassword" -d "MyDb"
```

As it was stated, database settings specified through cli have more priority over config file.

# Initializing a new database repository
As it was said, by executing `pdcsc init` in a folder we can prepare it to be used by `pdcsc`.

```bash
pdcsc init
```

`pdcsc` checks whether it is executed in a git repo and if not, creates one.

Then it creates `Scripts` folders and its sub-folders (if not already existed).

After that, it creates a list of files as below (if not already existed):

- gitignore
- pdcsc config
- pdcsc custom configs for development and production mode
- gitlabg and azuredevops cicd scripts

This command can be both executed in an empty folder and a non-empty folder.

## Customizing database setting through CLI
Using `-s`, `-d`, `-u`, `-p` and `-e` we can also ask `pdcsc` to createe config files with our own values, so there won't be a need to manually edit config files and changes database settings.

```bash
pdcsc init -s 192.168.10.10 -d OdooDb -u dteam -p 3246784
```

# Configuration
The behavior of `pdcsc` can be customized through its config file.

The config file is named `pdcsc-config.json` file. It is automatically created when initializing a new `pdcsc` repository using `init` command. The file is placed at the root of the repo.

Here's an example of a simple `pdcsc configuration file`:

```json
{
  "database": {
    "server": "localhost",
    "user": "db_user",
    "password": "db_password",
    "database": "my_database",
    "encrypt": false
  },
  "pipeline": "gitlabs",
  "masterBranchName": "origin/main"
}
```

## Properties
The full `pdcsc config` file with all its options is as follows:

```js
{
	"database": {
		"server": "...",	  // database server address (default = 'localhost')
		"user": "...",		  // database userid
		"password": "...",	// database password
		"database": "...",	  // master database name
		"encrypt": true | false,	  // encrypt connection or not
    "trustServerCertificate": true | false, // trust server certificate
    "connectionTimeout": number, // conenction timeout (default = 10 sec)
    "queryTimeout": number, // query timeout (default = 30 sec)
	},
	"pipeline": "...",			    // pipeline type (gitlabs = default, azuredevops)
	"masterBranchName": "...",		// master branch name (default = 'origin/main')
	"appVersionSprocName": "..."	// appVersion sp name (default = 'dbo.getAppVersion')
	"appVersionFormat": "...",		// app version timestamp (default = 'YYYY-MM-DD HH:mm:ss')
	"timestampLocale": "...",		// timestamp locale (default = 'en')
	"changesetsTableName": "...",	// database changeset history table (default = 'dbo.Changesets')
	"backupDbName": "...",			// name of temp database when testing changesets (default = 'TempBackupDB')
	"defaultCodePage": "",			// default .sql files codepage (default = 'utf-8')
	"paths": {
		"backupDir": "...",				// default backup dir on database server (default = 'C:\\temp\\')
		"changesetFolderName": "...",	// changesets folder name (default = 'Changes')
		"scriptsFolderName": "...",		// .sql scripts folder name (default = 'Scripts')
	},
	"folders": {
		"procedures": "...",	// name of procedures folder (default = 'Procedures')
		"functions": "...",	// name of user-defined functions folder (default = 'Functions')
		"tables": "...",		// name of tables folder (default = 'Tables')
		"relations": "...",	// name of relations folder (default = 'Relations')
		"types": "...",		// name of user-defined types folder (default = 'Types')
		"views": "...",		// name of views folder (default = 'Views')
		"indexes": "...",	// name of indexes folder (default = 'Indexes')
		"triggers": "...",	// name of triggers folder (default = 'Triggers')
		"schemas": "...",		// name of schemas folder (default = 'Schemas')
    "sequences": "...",		// name of sequences folder (default = 'Sequences')
    "synonyms": "...",		// name of synonyms folder (default = 'Synonyms')
    "queues": "...",		// name of service queues folder (default = 'Queues')
    "assemblies": "...",		// name of assemblies folder (default = 'Assemblies')
    "statistics": "...",		// name of statistics folder (default = 'Statistics')
	}
}
```

## Customization
We can customize `pdcsc configuration` through an environment variable named `PDCSC_CONFIG_MODE`.

If `pdcsc` detects such variable, it checks whether a `pdcsc-config.{env.PDCSC_CONFIG_MODE}.config` file exists or not.
If so, it merges that file with `pdcsc config` file (`pdcsc-config.json` or the custom config file specified through `-c` cli argument).

This way we can customize master branch name, database name or other config props based on our env variable or store sensitive data such as database password in our customized `pdcsc config` file.

In the second usage, we can add `pdcsc-config.{env.PDCSC_CONFIG_MODE}.json` in the `.gitignore`, so that the database password is not stored in the repository.

By default, `pdcsc-config.development.json` and `pdcsc-config.production.json` are already ignored (these two names are already added to `.gitignore` when project initialized through `pdcsc init`). If you are using another env value, don't forget to add your custom `pdcsc-config.{env}.json` to your `.gitignore` file.

# `roll`: creating changeset
In order to create a new changeset, we can use the `roll` command.

You should issue this command in a feature branch.

So, first create a feature branch and then run the following command.

```bash
pdcsc roll
```

As it was said, `roll` is the default command and mentioning it is not required.

```bash
pdcsc
```

## How `roll` command works?
Upon issuing `roll` command, `pdcsc` looks into the changes in current branch, looking for any changes in `.sql` files.

A change means:

- newly created file(s)
- modified file(s)
- renamed file(s)
- deleted file(s)

If there are any uncommitted changes, `pdcsc` first questions the user to specify whether he wants to commit the changes and include them in the changeset or not.

Then, it checks the history of current branch and includes any other changes it finds in `.sql` files.

After that, `pdcsc` merges all the changes and creates a changeset based on the collected changes.

What it creates is called a `Changeset template`.

It is simply a text file in which list of changed files are added based on their category.

Lastly, `pdcsc` renders the template and generates a `.sql` script for the changeset.

This is the end of what the `roll` command does.

## Changeset's filename format
a Changeset filename is composed of 3 parts:

```
{timestamp}_{mergeBase}_{branchName}
```

The first 14 characters of the changeset filename is called `timestamp` of the changeset.

It contains date/time when the `roll` command executed.

The next 8 characters after the first hyphen is `merge base`. It is a hash file extracted from the merge base of current branch (hash of the git node where current branch separated from the parent branch).

And the last part is branch name.

These 3 parts, make a changeset filename 99% unique (preventing potential conflicts) and also sortable (making changesets follow one another each time a new one is created).


## Updating changeset's timestamp

Each time `roll` command runs, `pdcsc` updates the timestamp of the changeset in current branch.

This is neccessary and very important.

It guarantees that newer changesets that are pushed more recently, always placed at the bottom in the `/Changes` folder.

## Changeset template structure
Each changeset template is simply a `.txt` file in which there are specific sections for each `Sql Server Object`.

A changeset's sections are as follows:

- `Assemblies`: changed/modified assembly objects
- `Types`: changed/modified user-defined types
- `Schemas`: changed/modified schema objects
- `Sequences`: changed/modified sequence objects
- `Synonyms`: changed/modified synonym objects
- `Queues`: changed/modified service queue objects
- `Statistics`: changed/modified service statistic objects
- `Tables`: changed/modified tables
- `Relations`: changed/modified relations (foreign keys)
- `Functions`: changed/modified user-defined functions (scaler, table-valued, aggregate, ...)
- `Procedures`: changed/modified stored-procedures
- `Views`: changed/modified user-defined views
- `Indexes`: changed/modified user-defined indexes
- `Triggers`: changed/modified triggers

Each section is denoted using a `##` marker at the beginning of the line.

Example:
```
## Procedures

## Tables
```

It is possible to use any other arbitrary characters in the section marker as well for more clarification.

```
## ============ Procedures ============

## ============ Tables ============
```

Lines with a single `#` characters are assumed comments and ignored. Empty lines are also ignored.

```
## ============ Procedures ============
# my comment
## ============ Tables ============
```

After a section marker, name of the changed `.sql` files (file name with extension) related to that section are listed.

```
## ============ Procedures ============
dbo.usp_Product_add.sql
dbo.usp_Product_edit.sql
dbo.usp_Product_remove.sql
dbo.usp_Product_getall.sql
## ============ Tables ============
dbo.Products.sql
```

The order of the sections in the template is not important.

Whitespaces at either sides of the lines are also ignored.

Developers can manually modify changeset templates, add more sections or items. However, this is not neccessary, as `pdcsc` is smart enough to manage the changeset, automatically adding new changed files into the template.

## Full Changeset
By default, `pdcsc` generates changeset's sections based on the files changed.

For example, if we have only changed a stored procedure, only a `Procedures` section is added to the changeset.

However, using a `-fc` or `--full-changeset` argument in CLI, we can ask `pdcsc` to include all sections in the template, even empty sections.

## Custom sections
There are two especial sections that provide the user to define any custom statements or queries to be executed at the start (before) and the end (after) of executing the changeset.

- `Custom Start`: run before changeset script.
- `Custom End`: run after changeset script.

## Changeset modification
As it was said, `pdcsc` manages the changeset automatically, adding new items or removing deleted items if their files are deleted. 

So, the user does not need to worry about anything.

The only thing he needs to focus on is his normal job, i.e. adding new tables, stored-procedure, editing existing user-defined functions, changing existing tables (adding a new column), defining new foreign keys, removing a stored procedure or table that will not be used any more, etc.

The only thing the user needs to do and should not forget is to issue a `pdcsc` command and update his branche's changeset.

He can then push his branch so that it is merged and his changes are applied to databases (based on cicd configs).

While `pdcsc` manages changesets automatically, developers can manually modify the changesets.

Although, this is not required, at times, a developer may want to encforce an object to be listed in a changeset even though it didn't have any changes in current branch.

## Idempotent changeset
An ideal changeset is a changeset that is idempotent regarding the changes it will apply on database.

This means that, if it is executed multiple times, it will not produce any side-effect or errors.

Let's show this in an exmaple.

Suppose we have the following changeset:

```
## =========== Custom-Start ===========
alter table Foo add Bar int null
```

The above changeset will add a column named `Bar` to a table named `Foo`.

The issue is that, if the changeset executes multiple times, it will generate an error on the second and following executions.

The reason is, `Foo` table already has a `Bar` column (first execution of the changeset added that). So, `ALTER` command fails.

The correct way of adding a column to a table is that we first check whether the table does not have that column already.

```
## =========== Custom-Start ===========
if not exists
(
  select 1
  from          sys.all_columns
  where object_id = object_id('Foo') and name = 'Bar'
)
  alter table Foo add Bar int null
go
```

This is just a simple check. A deeper check may want to check whether an existing `Bar` column has a correct type as well - it should be an `int` column - and if not, generate an error (someone may want to check default values, foreign keys and other things when applying a change).

As it is clear, the scope of this topic can be fairly wide.

Making a changeset idempotent is developers' responsibility and `pdcsc` does not have and is not able to provide such characteristic for changesets.

Anyhow, no matter how you satisfy it, it is highly recommended to make changesets idempotent.

## Rendering a changeset
Upon rendering a changeset, `pdcsc` processes sections and generates changeset script in the following order:

1. Custom-Start
2. Assemblies
3. Schemas
4. Types
5. Sequences
6. Tables
7. Relations
8. Functions
9. Synonyms
10. Procedures
11. Service Queues
12. Views
13. Indexes
14. Triggers
15. Statistics
16. Custom-End

`pdcsc` reads items listed in each section, looks up the file in `Scripts` folder, reads its content and appends it to the generated script.

## Why `Tables` and `Relations` are separated?
The reason why `Tables` and `Relations` have two distinct sections and foreign key declaration should be put in a distinct script file is that a foreign key can be created only when the parent table exist.

If the script of a child table is executed before its parent table is created, creating the foreign key will definitely fail.

Thus, we should create all tables first, without any relations.

Then, create foreign keys one by one.

This is the way `Generate Script` feature in `SQL Server Management Studio` works.

### example of a changeset
```
# ***            Changeset feature/f01          ***
## ===================== Custom-Start =====================
if not exists (select 1 from sys.all_collumns where object_id = object_id('Products') and name = 'Visible')
  alter table Products add Visible bit null constraint DF_Products_Visible default (1)
go
## ===================== Tables =====================
dbo.Payments.sql
## ===================== Procedures =====================
dbo.usp_Products_report.sql
## ===================== Custom-End =====================
update Products set Visible = 1 where Visible is null
```

- This changeset adds a new column named `Visible` to a `Products` table at the start of its execution.
- In order for the changeset to be idempotent, it first checks whether `Products` table already
includes the `Visible` column or not and adds it only when the table does not have such column.
- At the end, the changeset updates `Visible` columns in `Products` table whose value is `NULL` with `1`.

# `pipeline`: using `pdcsc` in `gitlab CI/CD pipeline`

In `GitLab`, we can create a custom CI/CD pipeline, and use `pdcsc` in it with `pipeline` command to ensure our database is updated automatically whenever a feature branche is merged.

Here is a sample `gitlab` pipeline:

```yaml
stages:
  - build

variables:
  GIT_DEPTH: 0

before_merge_build:
  stage: build
  image: node:alpine
  script:
    - echo "Installing dependencies..."
    - apk update && apk add git
    - npm i @puya/pdcsc -g
    - |
      if [ "$CI_MERGE_REQUEST_SOURCE_BRANCH_NAME" = "dev" ]; then
        echo "updating database ..."
        pdcsc apply -c "pdcsc-config-${CI_MERGE_REQUEST_TARGET_BRANCH_NAME}.json" -dbm -f
      else
        echo "checking branch changeset before merge ..."
        pdcsc pipeline -c "pdcsc-config-${CI_MERGE_REQUEST_TARGET_BRANCH_NAME}.json" -dbm
      fi
  rules:
    - when: manual`
```

Notes:
- Here, we assumed we have one stage branch, named `dev`.
- We merge our feature branches to `dev`, not `main`.
- The `dev` branch is our `development` stage where incomplete features are pushed and tested.
- This way, we do not push incomplete/not-tested features directly to main branch.
- Whenever we are ok with our `dev`, we merge it to `main` branch (bringing features to production).
- Upon merging `dev` to `main`, previous features are already merged into `dev`, there is no need to use `pipeline` switch.
- We use `apply` switch instead and update master database (apply changeset files from `dev` upon master database).
- In our pipeline, we explicitly specify config file for `pdcsc` through `-c` switch.
- Name of the config file depends on the source branch that is going to be merged.
- If it is `dev`, we are merging `dev` into `main`.
- So, target branch (`CI_MERGE_REQUEST_TARGET_BRANCH_NAME`) is `main`. We specify a config file named `pdcsc-config-{CI_MERGE_REQUEST_TARGET_BRANCH_NAME}.json` which would be `pdcsc-config-main.json`. So, the master database will be updated.
- If the source branch is not `dev`, we are mereging a feature branch.
- So, we know that our target branch is `dev`.
- This time, the config file `pdcsc-config-{CI_MERGE_REQUEST_TARGET_BRANCH_NAME}.json` would be `pdcsc-config-dev.json`.
- So, the development database will be updated.

Note that, we should have `pdcsc-config-dev.json` and `pdcsc-config-main.json` files in our repo.

`pdcsc-config-dev.json`
```json
{
  "database": {
    "database": "MyDb_dev"
  },
  "masterBranchName": "origin/dev"
}
```

`pdcsc-config-main.json`
```json
{
  "database": {
    "database": "MyDb_main"
  },
  "masterBranchName": "origin/main"
}
```

## Speed-up pipeline
We can create a Docker container, install `Node.js` and `Git` in it, so that these steps are not executed over and over again.
This can speed up pipeline execution.

```yaml
stages:
  - build

variables:
  GIT_DEPTH: 0
  DOCKER_REGISTRY: "our-node-and-git-docker-address:port"

before_merge_build:
  stage: build
  image: "${DOCKER_REGISTRY}/our-docker-registry/node-git"
  script:
    ...
```

# `apply`: Updating a database
Using `apply` argument we can execute all changesets against a database and update it with the latest changes we have.

```bash
pdcsc apply -d MyDb
```

This command is especial in a way that it does not need even a `git` repo, cicd tool, any branch, etc.

The only thing `pdcsc` requires when using this command is a `./Changes` folder where changeset scripts are located and enough config files that tell `pdcsc` what database it should apply the changesets on.

So, this command can be issued on the machine that can access target database.

In fact, this command can be handy tool for support teams that may need to manually update a customers' database.

## Changesets' Journal
`pdcsc` uses a table named `dbo.Changesets` in databases in order to save history of executed changesets.

After a changeset executes successfully, `pdcsc` inserts its name into `dbo.Changesets` table. This is called `journaling`.

Before `pdcsc` executes a changeset on a database, it checks `dbo.Changesets` table to see whether the changeset is already executed or not.

If such table does not exist, it shows an error and exits.

```bash
pdcsc apply -d MyDb
```

Output:
```
Journal table dbo.Changesets not found. Use -f or --force to create journal table.
```

Using `-f` or `--force` cli argument, we can ask `pdcsc` to create such table if it does not exits.

```bash
pdcsc apply -d MyDb -f
```

This behavior (manually use `-f` or force mode) is intentional in order to avoid updating an old database that is far behind our changesets (we may need to execute other updates on the database first).

There is also a `create-journal` command that creates the journal table as well.

```bash
pdcsc create-journal
```

The name of journal table can be customized in `pdcsc` config file through `changesetsTableName` prop.

## apply mode
The `apply` command has 3 modes which can be customized through `-m` argument:

- `Test`: test changesets against a backup of the database. This is useful when we want to make sure whether changesets will work correctly on the database or not.
- `TestAndUpdate` (default): test changesets first and if they are ok, apply them on database.
- `Update`: execute changesets directly against the database.

Ideally, we should use a `TestAndUpdate` mode as it is the default mode. However, if we are completely sure about our changesets or the test phase takes a long time (database is very large or under heavy load and backup/restore will take a long time), we can directly execute them on the database.

Example 1: only test changesets on a backup of database, not directly on database.
```bash
pdcsc apply -d MyDb -m Test
```

Example 2: apply changesets directly on database, do not test them beforehand.
```bash
pdcsc apply -d MyDb -m Update
```

## Test changesets one by one
By default, `pdcsc apply` creates a script bundle out of changesets and executes the whole bundle in one go against a database backup.

Using `-11` or `--one-by-one` cli argument we can ask `pdcsc` to test changesets one by one.

This can better highlight faulting changesets in case of errors.

```bash
pdcsc apply -d MyDb -11
```

# Manually render a changeset
By default, `pdcsc` renders `.sql` file of a changeset automatically when using `roll` command.

Using `render` cli argument we can manually render a changeset as well.

## Attention
MANUALLY RENDERING A CHANGESET IS NOT RECOMMENDED AND SHOULD BE AVOIDED AT ALL COSTS. RENDERING A CHANGESET SHOULD ONLY AND ONLY BE DONE EXACTLY IN THE BRANCH IT WAS CREATED AT.

IF YOU RENDER A CHANGESET IN ANOTHER BRANCH, THE GENERATED `.sql` MAY NOT BE CORRECT, MAY NOT BE EVEN GENERATED AND MAY NOT WORK OR MAY LEAD TO UNWANTED ERRORS, BUGS AND DISASTERS AT WORST CASE.

## Discussion
Suppose we are in branch `feature/fix-product-update` and we fix a sproc named `usp_Product_update`.

We generate a changeset, make a PR and the Team Lead who performs code reviews merges the branch.

Now, if we switch to branch `feature/create-reports` and we have not pulled our `main` branch to receive the changes, if we manually render the changeset of `feature/fix-product-update` branch, the generated `.sql` file is definitely incorrect, since we are creating `usp_Product_update` sproc using the copy in our own branch which is not up-to-date.

That is why, **it is never recommended to manually render a changeset** and this should be done in scarse cases and performed only by DBAs who know what they are doing.

## How to
We should specify the changeset we want to render through `-cs` cli argument.

```bash
pdcsc render -cs 20250412082457_b6775a321_feature-add-otp
```

If `-cs` is not specified, `pdcsc` shows list of all changesets found in `./Changes` folder and asks the user to choose which one to be rendered.

# Database version
Versioning is a mechanism that developers use to better maintain software products.

Adding version to a software executable part or a library is not a problem.

It is the database that providing versioning for that it is a little tricky.

`SQL Server` has a `Extended Pproperties` feature by which we can add version to our database.

Its advantage is that we can see it visually in a program like `SQL Server Management Studio` (`SSMS`).

However, using extended properties is a little awkward.

`pdcsc` provides another simple solution for this need.

## What is version of my database?
Last executed changeset in someway can be simply assumed as a version for a database.

There are two ways to see what last executed changeset is in a database:

1. Look into journal table (`dbo.Changesets`) and find the top 1 record (order by `Date` descending).
2. Use `dbo.GetAppVersion` sproc.

The first approach is not reliable that much, since journal table can be manually deleted or its records manipulated.

The `dbo.GetAppVersion` sproc is a utility sproc that `pdcsc` provides for this same purpose: database version.

It returns changeset's timestamp and name.

Here is a sample of this sproc's source in a feature branch named `feature/otp` that is executed in `2025/06/12 15:46:02`:

```sql
create or alter proc dbo.GetAppVersion as select '20250612154602' as applyDate, '20250612154602_7e02da54_feature_otp' as changeset
```

By invoking this sproc using a script like below, we can see what the last executed changeset is:

```sql
exec dbo.GetAppVersion
```

Sample Output:
| applyDate        | changeset                             |
| ---------------- | ------------------------------------- |
| `20250612154602` | `20250612154602_7e02da54_feature_otp` |

Each time a changeset is executed on a database, `dbo.GetAppVersion` is created/altered.

Thus, we can always know what version a database is.

## Customizing database versioning
### Custom name for `dbo.GetAppVersion`
`pdcsc` provides a `appVersionSprocName` property in its config by which we can use another name for our database versioning sproc.

```json
{
  "database": { ... },
  "appVersionSprocName": "dbo.ProductVersion"
}
```

### Custom script
There is also a `appVersionSprocTemplate` property by which we can completely customize how we want to implement versioning for our database.

For example suppose we prefer `Extended Properties` for versioning our database.

If this property is not empty, `pdcsc` ignores `GetAppVersion` method and simply appends that to the bottom of a changeset upon rendering.

There are two interpolation parameters that the custom `appVersionSprocTemplate` can have:

- `{ts}`
- `{changeset}`

`pdcsc` replaces these parameters with a changeset timestamp and its name respectively.

Here is example of a custom script for database version that uses extended properties:

```json
{
  "database": { ... },
  "appVersionSprocTemplate": "
go
if exists
(
	SELECT 1 FROM fn_listextendedproperty(NULL, NULL, NULL, NULL, NULL, NULL, NULL)
	WHERE NAME = 'ProductVersion'
)
	EXEC sp_updateextendedproperty @name = N'ProductVersion', @value = N'{ts}'
ELSE
	EXEC sp_addextendedproperty @name = N'ProductVersion', @value = N'{ts}'
go

if exists
(
	SELECT 1 FROM fn_listextendedproperty(NULL, NULL, NULL, NULL, NULL, NULL, NULL)
	WHERE NAME = 'LastChangeset'
)
	EXEC sp_updateextendedproperty @name = N'LastChangeset', @value = N'{changeset}'
ELSE
	EXEC sp_addextendedproperty @name = N'LastChangeset', @value = N'{changeset}'
"

}
```

# Best Practices and Guidelines

1. Do not store database password directly in `pdcsc-config.json` so that it is not stored in your source-control. Instead, use customized configs in the way described in `Config customization` section.
2. Use a `dev` and/or `test` stage in your development workflow and do not directly push/merge on `master`/`main` branch.
3. Employ a Sql Server DBA and Team Lead in your team who performs code review on feature branch merging and accepts merge only when he feels everything is all right.
4. Use a separate database for `dev`/`test` and `main`/`master` branches.
5. If possible, use a separate server for `main`/`master` database, other than `dev`/`test` server.
6. In your pipelines, use `pdcsc pipeline` for merging feature PRs and `pdcsc apply` for merging `dev`/`test` branches with `main`/`master` branch.
7. Do not change/alter `main`/`master` database directly. Let cicd pipelines and `pdcsc` update your database automatically.
8. Merge `dev`/`test` branch with `main`/`master` branch only when you really intend to bring changesets to production.
9. Do not use `sa` and/or `sysadmin` users in `dev`/`test` stages.
10. Use a less privilaged user in `dev`/`test` stages who can access only to development and test databases, not `master`/`main` database.
11. Use `sa` and/or `sysadmin` users in `main`/`master` branch who only DBAs have access to.
12. Never change/manipulate old changesets that fall behind other branches.
13. Never render existing changesets in a branch other than the branch they were created in. This can produce incorrect script, resulting in bugs, errors, data loss or any other bad consequence.
14. Do not remove feature branches immediately upon merge in your pipelines.
15. Keep feature branches for a period of time (like two or three weeks), so that you can refer to them and render their changes later if needed.
16. Dispose of feature branches only when you are sure the branches are ok and have no error and you will not return back to them in the future.

