import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import postcss from 'rollup-plugin-postcss';
import copy from 'rollup-plugin-copy';
import {terser} from "rollup-plugin-terser";
import json from 'rollup-plugin-json';

export default {
    input: 'index.js',
    output: {
        file: 'dist/bundle.js',
        format: 'esm'
    },
    plugins: [
        resolve(),
        commonjs(),
        json(),
        postcss({
            inject: false,
            minimize: false,
            plugins: []
        }),
        terser(),
        copy({
            targets: [
                'index.html',
                'node_modules/@webcomponents/webcomponentsjs/webcomponents-loader.js',
                'node_modules/@webcomponents/webcomponentsjs/bundles',
            ],
            outputFolder: 'dist'
        }),
        copy({
            targets: [
                'node_modules/select2/dist/css',
            ],
            outputFolder: 'dist/select2'
        })
    ]
};
