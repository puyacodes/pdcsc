# PDCSC - Puya Data Changeset Creator

## License

This tool is licensed under MIT License - see the [LICENSE](LICENSE) file for details.

## Introduction

`@puya/pdcsc` is a cli tool developed in nodejs that manages database scripts, generates changesets based on `.sql` file changes in repository, and provides automatic testing and executing of changesets.

Also, it can be used in CICD environments, like `gitlab pipeline` to automatically update a master database upon merging a feature branch to master branch.

Last but not least, it can be used manually to execute all changesets on a custom database, making the database up-to-date with the lastest changes.

## Features

- **Generate Changeset**: generates changeset based on committed changes detected in a current branch.
- **Test Changeset**: creates a database backup and executes the changeset against that to see whether the changeset is ok or not.
- **Pipeline Mode**: Using `-rop` argument, it can be used in `ci/cd pipelines` (like `gitlab`) to provide a safe merge, preventing the merge if the changeset has errors.
- **Update database**: Using `-ud` argument, it can test/execute changesets against a database and making the database up-to-date.

By default (withought specifying `-rop` or `-ud` arguments), `@puya/pdcsc` creates and manages a changeset.

## Installation
### Global

```bash
npm i @puya/pdcsc -g
```

### Local

```bash
npm install @puya/pdcsc
```

## Usage

Once installed, you can use the `pdcsc` command in your terminal. You should run this tool only in the root of your database repository.

```bash
pdcsc [arguments]
```

### CLI arguments

- `-v [version]`: Shows pdcsc version.
- `-c`: specifying custom config file
- `-s [server]`: database server address.
- `-u [user]`: database user.
- `-p [password]`: database password.
- `-d [database]`: target database.
- `-dbm`:	debug mode
- `-dbl`:	debug level (1: simple, 2: advanced, 3: details, 4: deep details)
- `-iuc`:	ignores pdcsc update check

**Note**: `-s`, `-u`, `-p` and `-d` cli args have more priority over same database settings in `pdcsc-config.json` config.

### Main commands

- `-v`: displays `pdcsc` version
- `-init`: Initializes a new database repository in current path, creates a git repo in it, creates default folders for database objects' scripts and creates a `pdcsc-config.json` config file and gitlab ci/cd yaml file.
- `--init-full`: same as `-init`, but creates a full `pdcsc-config.json` config file (containing all options).
- `-rop`: This switch should be used only in a pipeline. It Tests the changeset of current branch and if it succeeds, executes changeset over the database database specified (making it up-to-date).
- `-ud`: Test/Updates a database by running all changesets against that.
- `-rum`: Specifies update mode (`Test`, `TestAndUpdate` -*default- , `Update`)

## Examples

1. Initializing a new database repository:

```bash
pdcsc -init
```

1. Creating/Updating changeset:

```bash
pdcsc
```

2. Updating master database upon merge requests in CI/CD:

```bash
pdcsc -rop
```

3. Manually updating an existing database

```bash
pdcsc -ud -d MyDb
```

5. Specifying database setting through cli:

```bash
pdcsc -s "192.168.10.120" -u "myUser" -p "myPassword" -d "MyDb"
```

Database settings specified through cli have more priority over config file.

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
    "database": "my_database"
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
		"database": "..."	  // master database name
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
		"Procedures": "...",	// name of procedures folder (default = 'Procedures')
		"Functions": "...",	// name of user-defined functions folder (default = 'Functions')
		"Tables": "...",		// name of tables folder (default = 'Tables')
		"Relations": "...",	// name of relations folder (default = 'Relations')
		"Types": "...",		// name of user-defined types folder (default = 'Types')
		"Views": "...",		// name of views folder (default = 'Views')
		"Indexes": "...",	// name of indexes folder (default = 'Indexes')
		"Triggers": "...",	// name of triggers folder (default = 'Triggers')
		"Schemas": "..."		// name of schemas folder (default = 'Schemas')
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

In `GitLab`, we can create a custom CI/CD pipeline, and use `pdcsc` in it with `-rop` argument to ensure our database is updated automatically whenever a feature branche is merged.

Here is a sample gitlab pipeline:

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
        node index.js -ud -dbm -c "pdcsc-config-${CI_MERGE_REQUEST_TARGET_BRANCH_NAME}.json"
      else
        echo "checking branch changeset before merge ..."
        node index.js -rop -dbm -c "pdcsc-config-${CI_MERGE_REQUEST_TARGET_BRANCH_NAME}.json"
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
- Upon merging `dev` to `main`, previous features are already merged into `dev`, there is no need to use `-rop` switch.
- We use `-ud` switch instead and update master database (apply changeset files from `dev` upon master database).
- In our pipeline, we explicitly specify config file for `pdcsc` through `-c` switch.
- Name of the config file depends on the source branch that is going to be merged.
- If it is `dev`, we are merging `dev` into `main`.
- So, target branch (`CI_MERGE_REQUEST_TARGET_BRANCH_NAME`) should be `main`. We specify a config file named `pdcsc-config-{CI_MERGE_REQUEST_TARGET_BRANCH_NAME}.json` which would be `pdcsc-config-main.json`. So, the master database will be updated.
- If the source branch is not `dev`, we are mereging a feature branch.
- So, we our target branch is `dev`.
- This time, the config file `pdcsc-config-{CI_MERGE_REQUEST_TARGET_BRANCH_NAME}.json` would be `pdcsc-config-dev.json`.
- So, the development database will be updated.

Note that, we should have `pdcsc-config.dev.json` and `pdcsc-config.main.json` files in our repo.

`pdcsc-config.dev.json`
```json
{
  "database": {
    "database": "MyDb_dev"
  },
  "masterBranchName": "origin/dev"
}
```

`pdcsc-config.main.json`
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
Using `-ud` argument we can execute all changesets against a database and update it with the latest changes we have.

```bash
pdcsc -ud -d MyDb
```

The `-ud` command has 3 modes which can be customized through `-rum` argument:

- `Test`: test changesets against a backup of the database. This is useful when we want to make sure whether changesets will work correctly on the database or not.
- `TestAndUpdate` (default): test changesets first and if they were ok, update database.
- `Update`: execute changesets directly against the database.

Ideally, we should use a `TestAndUpdate` mode as it is the default mode. However, if we are completely sure about our changesets or the test phase takes a long time due (database is very large or under heavy load and backup/restore will take a long time), we can directly execute them on the database.

### Changeset execution history
`pdcsc` uses a table named `dbo.Changesets` in databases in order to save history of executed changesets.

After a changeset was executed successfully, `pdcsc` inserts its name into `dbo.Changesets` table.

Before `pdscs` executes a changeset on a database, it checks `dbo.Changesets` table to see whether the changeset is already executed or not.

The name of this table can be customized in `pdcsc` config file through `changesetsTableName` prop.

            

