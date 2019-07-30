import path from 'path';
import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import postcss from 'rollup-plugin-postcss';
import copy from 'rollup-plugin-copy';
import {terser} from "rollup-plugin-terser";
import json from 'rollup-plugin-json';
import replace from "rollup-plugin-replace";
import serve from 'rollup-plugin-serve';
import multiEntry from 'rollup-plugin-multi-entry';

const build = (typeof process.env.BUILD !== 'undefined') ? process.env.BUILD : 'local';
console.log("build: " + build);

export default {
    input: (build != 'test') ? 'src/index.js' : 'test/**/*.js',
    output: {
        file: 'dist/bundle.js',
        format: 'esm'
    },
    onwarn: function (message, warn) {
        // ignore chai warnings
        if (message.code === 'CIRCULAR_DEPENDENCY') {
            return;
        }
        // ignore "suggestions" warning re "use strict"
        if (message.code === 'MODULE_LEVEL_DIRECTIVE') {
            return;
        }
        warn(message);
    },
    plugins: [
        multiEntry(),
        resolve({
          customResolveOptions: {
            // ignore node_modules from vendored packages
            moduleDirectory: path.join(process.cwd(), 'node_modules')
          }
        }),
        commonjs({
          namedExports: {
            'chai': ['expect', 'assert']
          }
        }),
        json(),
        replace({
            "process.env.BUILD": '"' + build + '"',
        }),
        postcss({
            inject: false,
            minimize: false,
            plugins: []
        }),
        (build !== 'local' && build !== 'test') ? terser() : false,
        copy({
            targets: [
                'assets/index.html',
                'assets/favicon.ico',
            ],
            outputFolder: 'dist'
        }),
        copy({
            targets: [
                'node_modules/select2/dist/css',
            ],
            outputFolder: 'dist/select2'
        }),
        copy({
            targets: [
                'node_modules/suggestions/dist/suggestions.css',
            ],
            outputFolder: 'dist/suggestions'
        }),
        (process.env.ROLLUP_WATCH === 'true') ? serve({contentBase: 'dist', host: '127.0.0.1', port: 8001}) : false
    ]
};
