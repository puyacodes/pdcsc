const commonjs = require('@rollup/plugin-commonjs');
const resolve = require('@rollup/plugin-node-resolve');
const json = require('@rollup/plugin-json');
const del = require('rollup-plugin-delete');

module.exports = {
    input: "./con1.js",
    plugins: [
        del({ targets: './con1.cjs.js' }),
        //resolve(), // Allows Rollup to resolve modules in 'node_modules'
        commonjs(), // Convert CommonJS modules to ES6, so Rollup can bundle them
        json(),
    ],
    output: {
        file: "./con1.cjs.js",
        format: "cjs",
    }
};