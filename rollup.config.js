import path from 'path';
import url from 'url';
import glob from 'glob';
import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import copy from 'rollup-plugin-copy';
import {terser} from "rollup-plugin-terser";
import json from '@rollup/plugin-json';
import replace from "@rollup/plugin-replace";
import serve from 'rollup-plugin-serve';
import urlPlugin from "@rollup/plugin-url";
import consts from 'rollup-plugin-consts';
import del from 'rollup-plugin-delete';
import emitEJS from 'rollup-plugin-emit-ejs'
import babel from 'rollup-plugin-babel'
import chai from 'chai';

const pkg = require('./package.json');
const build = (typeof process.env.BUILD !== 'undefined') ? process.env.BUILD : 'local';
console.log("build: " + build);
let basePath = '';
switch (build) {
  case 'local':
    basePath = '/dist/';
    break;
  case 'production':
    basePath = '/';
    break;
  case 'development':
  case 'demo':
  case 'test':
    basePath = '/apps/library/';
    break;
  default:
    console.error('Unknown build environment: ' + build);
    process.exit(1);
}

// Disabled because we don't support (old) Edge right now and babel is slow.
// But this should be a good starting point in case that changes.
const USE_BABEL = false;

const CHUNK_BLACKLIST = [
  'jszip'  // jszip is a node module by default and rollup chunking is confused by that and emits warnings
];

/**
 * Returns a list of chunks used for splitting up the bundle.
 * We recursively use every dependency and ever internal dev dependency (starting with 'vpu-').
 */
function getManualChunks(pkg) {
  let manualChunks = Object.keys(pkg.dependencies).reduce(function (acc, item) { acc[item] = [item]; return acc;}, {});
  const vpu = Object.keys(pkg.devDependencies).reduce(function (acc, item) { if (item.startsWith('vpu-')) acc[item] = [item]; return acc;}, {});
  for (const vpuName in vpu) {
    const subPkg = require('./node_modules/' + vpuName + '/package.json');
    manualChunks = Object.assign(manualChunks, getManualChunks(subPkg));
  }
  manualChunks = Object.assign(manualChunks, vpu);
  for(const name of CHUNK_BLACKLIST) {
    delete manualChunks[name];
  }
  return manualChunks;
}

function getBuildInfo() {
    const child_process = require('child_process');
    const url = require('url');

    let remote = child_process.execSync('git config --get remote.origin.url').toString().trim();
    let commit = child_process.execSync('git rev-parse --short HEAD').toString().trim();

    let parsed = url.parse(remote);
    let newPath = parsed.path.slice(0, parsed.path.lastIndexOf('.'));
    let newUrl = parsed.protocol + '//' + parsed.host + newPath + '/commit/' + commit;

    return {
        info: commit,
        url: newUrl,
        time: new Date().toISOString(),
        env: build
    }
}

export default {
    input: (build != 'test') ? [
      'src/vpu-library.js',
      'src/vpu-library-shelving.js',
      'src/vpu-library-create-loan.js',
      'src/vpu-library-return-book.js',
      'src/vpu-library-renew-loan.js',
      'src/vpu-library-book-list.js',
      'src/vpu-library-loan-list.js',
      'src/vpu-library-order-list.js',
      'src/vpu-library-profile.js',
    ] : glob.sync('test/**/*.js'),
    output: {
      dir: 'dist',
      entryFileNames: '[name].js',
      chunkFileNames: 'shared/[name].[hash].[format].js',
      format: 'esm',
      sourcemap: true
    },
    manualChunks: getManualChunks(pkg),
    onwarn: function (warning, warn) {
        // ignore "suggestions" warning re "use strict"
        if (warning.code === 'MODULE_LEVEL_DIRECTIVE') {
            return;
        }
        // ignore chai warnings
        if (warning.code === 'CIRCULAR_DEPENDENCY') {
          return;
        }
        // keycloak bundled code uses eval
        if (warning.code === 'EVAL') {
          return;
        }
        warn(warning);
    },
    watch: {
      chokidar: {
        usePolling: true
      }
    },
    plugins: [
        del({
          targets: 'dist/*'
        }),
        consts({
          environment: build,
          buildinfo: getBuildInfo(),
        }),
        emitEJS({
          src: 'assets',
          include: ['**/*.ejs', '**/.*.ejs'],
          data: {
            geturl: (p) => {
              return url.resolve(basePath, p);
            }
          }
        }),

        resolve({
          customResolveOptions: {
            // ignore node_modules from vendored packages
            moduleDirectory: path.join(process.cwd(), 'node_modules')
          }
        }),
        commonjs({
            include: 'node_modules/**',
            namedExports: {
              'chai': Object.keys(chai),
            }
        }),
        json(),
        urlPlugin({
          limit: 0,
          include: [
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
                {src: 'assets/silent-check-sso.html', dest:'dist'},
                {src: 'assets/htaccess-shared', dest: 'dist/shared/', rename: '.htaccess'},
                {src: 'assets/*.css', dest: 'dist/local/' + pkg.name},
                {src: 'assets/*.ico', dest: 'dist/local/' + pkg.name},
                {src: 'assets/fonts/*', dest: 'dist/local/' + pkg.name + '/fonts'},
                {src: 'node_modules/vpu-common/vpu-spinner.js', dest: 'dist/local/' + pkg.name, rename: 'spinner.js'},
                {src: 'assets/icon-*.png', dest: 'dist/local/' + pkg.name},
                {src: 'assets/manifest.json', dest: 'dist', rename: pkg.name + '.manifest.json'},
                {src: 'assets/*.metadata.json', dest: 'dist'},
                {src: 'assets/nomodule.js', dest: 'dist/local/' + pkg.name},
                {src: 'node_modules/vpu-common/assets/icons/*.svg', dest: 'dist/local/vpu-common/icons'},
            ],
        }),
        copy({
            targets: [
                {src: 'node_modules/datatables.net-dt/css', dest: 'dist/local/vpu-data-table-view/'},
                {src: 'node_modules/datatables.net-dt/images', dest: 'dist/local/vpu-data-table-view/'},
                {src: 'node_modules/datatables.net-responsive-dt/css', dest: 'dist/local/vpu-data-table-view'},
                {src: 'node_modules/datatables.net-buttons-dt/css', dest: 'dist/local/vpu-data-table-view'},
            ],
        }),
        USE_BABEL && babel({
          exclude: 'node_modules/**',
          babelHelpers: 'runtime',
          babelrc: false,
          presets: [[
            '@babel/env', {
              modules: false,
              targets: {
                firefox: "68",
                chrome: "76",
                safari: "13",
                edge: "76"
              }
            }
          ]],
          plugins: [[
            '@babel/plugin-transform-runtime', {
              corejs: 3,
              useESModules: true
            }
          ]]
        }),
        (process.env.ROLLUP_WATCH === 'true') ? serve({contentBase: '.', host: '127.0.0.1', port: 8001, historyApiFallback: basePath + pkg.name + '.html'}) : false
    ]
};
