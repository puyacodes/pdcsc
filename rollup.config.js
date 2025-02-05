const commonjs = require('@rollup/plugin-commonjs');
const resolve = require('@rollup/plugin-node-resolve');
const json = require('@rollup/plugin-json');
const terser = require('@rollup/plugin-terser');
// const { babel } = require("@rollup/plugin-babel");

module.exports = {
    input: "src/index.js",
    // plugins: [
    //     babel({
    //         babelHelpers: "bundled",
    //         presets: ["@babel/preset-env"],
    //     }),
    // ],
    plugins: [
        resolve(), // Allows Rollup to resolve modules in 'node_modules'
        terser(),
        commonjs(), // Convert CommonJS modules to ES6, so Rollup can bundle them
        json()
    ],
    output: {
        file: "./bin/index.js",
        format: "cjs",
    },
    external: (id) => {
        // Exclude all modules in node_modules
        return id.startsWith('\0') || id.includes('node_modules');
    },
};