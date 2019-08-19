import path from 'path';
import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import copy from 'rollup-plugin-copy';
import {terser} from "rollup-plugin-terser";
import json from 'rollup-plugin-json';
import replace from "rollup-plugin-replace";
import serve from 'rollup-plugin-serve';
import multiEntry from 'rollup-plugin-multi-entry';
import url from "rollup-plugin-url";

const pkg = require('./package.json');
const build = (typeof process.env.BUILD !== 'undefined') ? process.env.BUILD : 'local';
console.log("build: " + build);

export default {
    input: (build != 'test') ? ['src/index.js'] : 'test/**/*.js',
    output: {
      dir: 'dist',
      entryFileNames: pkg.name + '.js',
      chunkFileNames: 'shared/[name].[hash].[format].js',
      format: 'esm'
    },
    manualChunks: Object.keys(pkg.dependencies).reduce(function (acc, item) { acc[item] = [item]; return acc;}, {}),
    onwarn: function (message, warn) {
        // ignore "suggestions" warning re "use strict"
        if (message.code === 'MODULE_LEVEL_DIRECTIVE') {
            return;
        }
        warn(message);
    },
    plugins: [
        (build == 'test') ? multiEntry() : false,
        resolve({
          customResolveOptions: {
            // ignore node_modules from vendored packages
            moduleDirectory: path.join(process.cwd(), 'node_modules')
          }
        }),
        commonjs({
            include: 'node_modules/**'
        }),
        json(),
        url({
          limit: 0,
          include: [
            "node_modules/bulma/**/*.css",
            "node_modules/bulma/**/*.sass",
            "node_modules/suggestions/**/*.css",
            "node_modules/select2/**/*.css",
          ],
          emitFiles: true,
          fileName: 'shared/[name].[hash][extname]'
        }),
        replace({
            "process.env.BUILD": '"' + build + '"',
        }),
        (build !== 'local' && build !== 'test') ? terser() : false,
        copy({
            targets: [
                {src: 'assets/index.html', dest: 'dist', rename: pkg.name + '.html'},
                {src: 'assets/*', dest: 'dist/local/' + pkg.name},
            ],
        }),
        (process.env.ROLLUP_WATCH === 'true') ? serve({contentBase: 'dist', host: '127.0.0.1', port: 8001, historyApiFallback: '/' + pkg.name + '.html'}) : false
    ]
};
