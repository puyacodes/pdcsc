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