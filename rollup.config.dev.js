const commonjs = require('@rollup/plugin-commonjs');
const resolve = require('@rollup/plugin-node-resolve');
const json = require('@rollup/plugin-json');
const del = require('rollup-plugin-delete');

module.exports = {
    input: "src/index.js",
    plugins: [
        del({ targets: 'bin/*' }),
        //resolve(), // Allows Rollup to resolve modules in 'node_modules'
        commonjs(), // Convert CommonJS modules to ES6, so Rollup can bundle them
        json(),
    ],
    output: {
        file: "./bin/index.js",
        format: "cjs",
    }
};