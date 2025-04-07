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
