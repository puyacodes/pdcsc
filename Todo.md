### Programmatic Use

We can also use `pdcsc` as a module in our Node.js projects.

Example:

```javascript
const pdcsc = require('@puya/pdcsc');

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
```


## new bugs 1404/01/20
1.
create a new file
commit
pdcsc
	it should ask 'create drops' for committed deletions as well

2.
	add a new file
	pdcsc
	delete file
	pdcsc	=> it says 'Skipped changeset testing. No new changes detected.'
		whereas it had to detect this missing file during test and commit.
		but it skips test and commit.

3.
delete a file
commit
pdcsc
	it should ask 'create drops' for committed deletions as well

## new commands 1404/03/17

pdcsc rel dbo.FinVchLs
	reports parent/child objects that relate to dbo.FinVchLs

pdcsc affect dbo.FinVchLs -t view,udf
	adds child objects who depend on dbo.FinVchLs to changeset

pdcsc diff 14040101 14040302
	creates an update bundle by merging all changesets between the two timestamps

pdcsc get-bundle
	creates an update bundle script produced by merging all changesets
	from target database last changeset until now (last changeset in ./Changes folder)

pdcsc check
	checks whether ./Changes folder match target database's last changeset and app version

pdcsc report
	reports last changeset executed on target database, list of changesets executed on it
	and its current app version (timestamp, branch)

pdcsc info
	reports information about a database:
		total tables, sprocs, udfs, ...