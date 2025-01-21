
# PDCSC - Changeset Processor

PDCSC is a Node.js script that processes database changes, generates SQL scripts based on uncommitted changes in the codebase, and allows automatic backup and execution of scripts against databases. It supports multiple options for different environments, such as running in a Git pipeline or directly on a development machine.

## Features

- **Generate Changeset Scripts**: Automatically generates SQL scripts based on the changes detected in the codebase.
- **Backup and Restore Database**: Automatically creates a backup of the database before applying the changes.
- **Multiple Modes of Execution**:
  - `-rop`: Can be used in Git pipelines to run scripts before merging a branch to ensure the database is updated before the merge.
  - `-rom`: Executes the changes directly on the main database after running the backup.
  - Default mode: Runs the changes on the local machine without directly affecting the main database.

## Installation

You can install PDCSC globally for CLI use or locally in your project.

### Global Installation

Install globally to use the `pdcsc` command:

```bash
npm install -g pdcsc
```

### Local Installation

Install locally in your project:

```bash
npm install pdcsc
```

## Usage

### CLI

Once installed globally, you can use the `pdcsc` command in your terminal.

```bash
pdcsc [options]
```

#### Options

- `-rop`: Run the script in a Git pipeline environment to test changes before merging.
- `-rom`: Run the script directly on the main database after applying changes to the backup.
- `-csf [file]`: Specify a custom changeset file. If not provided, the script will generate one.
- `-s [server]`: Specify the database server.
- `-u [user]`: Specify the database user.
- `-p [password]`: Specify the database password.
- `-d [database]`: Specify the database name.

#### Examples

1. Run the script on the local machine:

   ```bash
   pdcsc
   ```

2. Run the script with the `-rom` option to apply changes directly on the main database after the backup:

   ```bash
   pdcsc -rom
   ```

3. Run the script with the `-rop` option in a Git pipeline:

   ```bash
   pdcsc -rop
   ```

4. Generate a custom changeset file:

   ```bash
   pdcsc -csf myChangeset.txt
   ```

5. Specify a custom database server, user, and password:

   ```bash
   pdcsc -s "myServer" -u "myUser" -p "myPassword" -d "myDatabase"
   ```

### Configuration

The configuration for the script is stored in the `config.json` file, which should be placed in the root directory of the project. Here's an example of how the configuration file should look:

```json
{
  "database": {
    "server": "localhost",
    "user": "db_user",
    "password": "db_password",
    "databaseName": "my_database"
  },
  "paths": {
    "basePath": "./",
    "backupDir": "./backups",
    "changesetFolderName": "Changes",
    "appVersionFormat": "YYYY-MM-DD_HH-mm-ss",
    "timestampLocale": "fa",
    "masterBranchName": "origin/dev"
  }
}
```

- **database**: Database credentials such as the server, username, password, and database name.
- **paths**: Paths used for backups, changesets, and other files in the script.

### Workflow Example

#### Scenario 1: Running in a GitLab Pipeline

In a GitLab CI/CD pipeline, you can use the `-rop` option to ensure that the database is updated before merging a branch. The pipeline configuration might look like this:

```yaml
stages:
  - build
  - deploy

deploy:
  stage: deploy
  script:
    - pdcsc -rop
  only:
    - merge_requests
```

#### Scenario 2: Running Locally on Development Machine

If you're working locally, you can simply run the script without any options to generate the changeset and apply it to the backup database.

```bash
pdcsc
```

You can also provide specific database details via the command line:

```bash
pdcsc -s "dev-server" -u "dev-user" -p "dev-password" -d "dev-db"
```

#### Scenario 3: Deploying Changes to the Main Database

To deploy the changes directly to the main database after the backup:

```bash
pdcsc -rom
```

<!-- ### Programmatic Use

You can also use PDCSC as a module in your Node.js projects.

Example:

```javascript
const pdcsc = require('pdcsc');

const result = pdcsc({
    locale: 'en',
    outputFileName: 'result.json',
    template: '{ "changeset": "{ts}" }',
    format: 'YYYYMMDDHHmmss'
});

if (result.success) {
    console.log(`Changeset script generated successfully: ${result.outputFileName}`);
} else {
    console.error('Failed to generate changeset:', result.err);
}
``` -->

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
