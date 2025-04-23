# PDCSC - Puya Data Changeset Creator

## License

This tool is licensed under MIT License - see the [LICENSE](LICENSE) file for details.

## Introduction

`@puya/pdcsc` is a cli tool developed in nodejs that manages database scripts, generates changesets based on `.sql` file changes in repository, and provides automatic testing and executing of changesets.

Also, it can be used in CICD environments, like `gitlab pipeline` to automatically update a master database upon merging a feature branch to master branch.

Last but not least, it can be used manually to execute all changesets on a custom database, making the database up-to-date with the lastest changes.

## Features

- **Generate Changeset**: generates changeset based on committed changes detected in a branch.
- **Test Changeset**: creates a database backup and executes the changeset against that to see whether the changeset is ok or not.
- **Pipeline Mode**: Using `pipeline` argument, it can be used in `ci/cd pipelines` (like `gitlab` or `azuredevops`) to provide a safe merge, preventing the merge if the changeset has errors.
- **Update database**: Using `apply` argument, it can apply changesets(s) on a database and making the database up-to-date.

By default (withought specifying `pipeline` or `apply` arguments), `@puya/pdcsc` manages current branch's changeset.

## Installation
### Global

```bash
npm i @puya/pdcsc -g
```

### Local

```bash
npm install @puya/pdcsc
```
## Current Version
```
2.1.26
```

## Usage

Once installed, you can use the `pdcsc` command in your terminal. You should run this tool only in the root of your database's scripts repository.

```bash
pdcsc [cmd] [arguments] [options]
```

### Main commands

- `init`: Initializes a new database repository in current path, creates a git repo in it (if no git repo found), creates default scripts folders and creates a `pdcsc-config.json` config file and gitlab ci/cd yaml file.
- `roll`: Creates/Updates a changeset based on `.sql` changes in current branch in `./Scripts` folder. This is the default command.
- `apply`: Applies all changesets in `./Changes` folder on a database (updates the database).
- `pipeline`: Used in CICD pipelines, tests changeset of current branch that its merge is requested and if it succeeds, executes changeset over the database specified (making it up-to-date).
- `render`: Renders a changeset and creates a `.sql` file for that (overwrites existing `.sql` file, but does not commit it)
- `check-update`: checks whether a new version for `pdcsc` is available or not.

### CLI arguments

- `-v` or `--version`: Shows pdcsc version.
- `-?` or `--help`: Shows pdcsc help.
- `-c` or `--config`: specifying custom config file
- `-s` or `--server`: database server address.
- `-u` or `--user`: database user.
- `-p` or `--password`: database password.
- `-d` or `--database`: target database.
- `-e` or `--encrypt`: encrypt database connection or not (default is `false`).
- `-dbm` or `--debug-mode`:	debug mode
- `-dbl` or `--debug-level`:	debug level (1: simple, 2: advanced, 3: details, 4: deep details)

**Note**: `-s`, `-u`, `-p`, `-d` and `-e` cli args have more priority over same database settings in `pdcsc-config.json` config.

## Examples

1. Initializing a new database repository:

```bash
pdcsc -init
```

Initializing a new database repository with full config:

```bash
pdcsc -init -f
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

## Configuration
The behavior of `pdcsc` can be customized through its config file.

The config file is named `pdcsc-config.json` file. It is automatically created upon initializing a new `pdcsc` repository using `-init` command. The file is placed at the root of the repo.

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

### Config Description
The full `pdcsc config` file with all its options is as follows:

```js
{
	"database": {
		"server": "...",	  // database server address (default = 'localhost')
		"user": "...",		  // database userid
		"password": "...",	// database password
		"database": "...",	  // master database name
		"encrypt": "..."	  // encrypt connection or not
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
		"schemas": "..."		// name of schemas folder (default = 'Schemas')
	}
}
```

### Config customization
We can customize `pdcsc configuration` using an environment variable named `PDCSC_CONFIG_MODE`.

If `pdcsc` detects such envionment variable, it checks whether a `pdcsc-config.{env.PDCSC_CONFIG_MODE}.config` file exists or not.
If so, it merges that file with `pdcsc-config.json` file.

This, enables us to customize master branch name or database name based on env or store sensitive data such as database password in a customized `pdcsc config` file.

In the second usage, we can then add `pdcsc-config.{env.PDCSC_CONFIG_MODE}.json` in the `.gitignore`, so that the database password is not stored in the repository.

## Using `pdcsc` in `gitlab CI/CD pipeline`

In `GitLab`, we can create a custom CI/CD pipeline, and use `pdcsc` in it with `pipeline` argument to ensure our database is updated automatically whenever a feature branche is merged.

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
        node index.js apply -c "pdcsc-config-${CI_MERGE_REQUEST_TARGET_BRANCH_NAME}.json" -dbm -f
      else
        echo "checking branch changeset before merge ..."
        node index.js pipeline -c "pdcsc-config-${CI_MERGE_REQUEST_TARGET_BRANCH_NAME}.json" -dbm
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
- So, target branch (`CI_MERGE_REQUEST_TARGET_BRANCH_NAME`) should be `main`. We specify a config file named `pdcsc-config-{CI_MERGE_REQUEST_TARGET_BRANCH_NAME}.json` which would be `pdcsc-config-main.json`. So, the master database will be updated.
- If the source branch is not `dev`, we are mereging a feature branch.
- So, we our target branch is `dev`.
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

### Speed-up pipeline
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

## Manually updating a database
Using `apply` argument we can execute all changesets against a database and update it with the latest changes we have.

```bash
pdcsc apply -d MyDb
```

### Changeset execution history
`pdcsc` uses a table named `dbo.Changesets` in databases in order to save history of executed changesets.

After a changeset executes successfully, `pdcsc` inserts its name into `dbo.Changesets` table. This is called `journaling`.

Before `pdcsc` executes a changeset on a database, it checks `dbo.Changesets` table to see whether the changeset is already executed or not.

If such table does not exist, it shows and error and exits.

Using `-f` or `--force` cli argument, we can ask `pdcsc` to create such table if it does not exits.

```bash
pdcsc apply -d MyDb
```
Output:
```
Journal table dbo.Changesets not found. Use -f or --force to create journal table.
```

```bash
pdcsc apply -d MyDb -f
```

This behavior (manually use `-f` or force mode) is intentional in order to avoid updating an old database that is far behind our changesets and other updates should be applied on that before hand.

The name of journal table can be customized in `pdcsc` config file through `changesetsTableName` prop.

### Update mode
The `apply` command has 3 modes which can be customized through `-m` argument:

- `Test`: test changesets against a backup of the database. This is useful when we want to make sure whether changesets will work correctly on the database or not.
- `TestAndUpdate` (default): test changesets first and if they were ok, update database.
- `Update`: execute changesets directly against the database.

Ideally, we should use a `TestAndUpdate` mode as it is the default mode. However, if we are completely sure about our changesets or the test phase takes a long time due (database is very large or under heavy load and backup/restore will take a long time), we can directly execute them on the database.

Example: only test changesets on a backup of database, not directly on database.
```bash
pdcsc apply -d MyDb -m Test
```

Example: apply changesets directly on database, do not test them beforehand.
```bash
pdcsc apply -d MyDb -m Update
```

### Test changesets one by one
By default, `pdcsc apply` creates a bundle out of changesets and executes the bundle against a database backup.

Using `-11` or `--one-by-one` cli argument we can ask `pdcsc` to test changesets one by one.

This can better highlight faulting changesets in case of errors.

```bash
pdcsc apply -d MyDb -11
```

## Manually render a changeset
By default `pdcsc` renders or generates `.sql` file of a changeset when using `roll` command (default command).

Using `render` cli argument we can manually render a changeset.

### Discussion
Manually rendering a changeset is not recommended and should be avoided at all costs. Rendering a changeset should ONLY and ONLY be done exactly in the branch it was created at.

If you render a changeset in another branch, the generated `.sql` may not be correct, may not be even generated and may not work or may lead to unwanted errors, bugs and disasters at worst case.

Suppose we are in branch `feature/fix-product-update` and we fix a sproc named `usp_Product_update`.

We generate a changeset, make a PR and the Team Lead in our company who performs code reviews merges the branch.

Now, if we switch to branch `feature/create-reports` and we have not pulled our `main` branch to receive the changes, if we intend to render the changeset of `feature/fix-product-update` branch, the `.sql` file being generated definitely is not correct, since we are creating `usp_Product_update` sproc using the copy in our own branch which is not up-to-date.

That is why, it is never recommended to manually render a changeset and this should be done in scarse cases and performed only by DBAs who know what they are doing.

### Usage
We can specify the changeset for which we intend to create `.sql` file using `-cs` cli argument.

```bash
pdcsc render -cs 20250412082457_b6775a321_feature-add-otp
```

The `-cs` argument is optional. If it is not specified, `pdcsc` shows list of all changesets found in `./Changes` folder and asks to choose which one to render.

