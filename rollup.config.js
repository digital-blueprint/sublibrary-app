import path from 'path';
import fs from 'fs';
import url from 'url';
import glob from 'glob';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import copy from 'rollup-plugin-copy';
import {terser} from "rollup-plugin-terser";
import json from '@rollup/plugin-json';
import replace from "@rollup/plugin-replace";
import serve from 'rollup-plugin-serve';
import urlPlugin from "@rollup/plugin-url";
import consts from 'rollup-plugin-consts';
import del from 'rollup-plugin-delete';
import emitEJS from 'rollup-plugin-emit-ejs'
import babel from '@rollup/plugin-babel'
import selfsigned from 'selfsigned';

// -------------------------------

// Some new web APIs are only available when HTTPS is active.
// Note that this only works with a Non-HTTPS API endpoint with Chrome,
// Firefox will emit CORS errors, see https://bugzilla.mozilla.org/show_bug.cgi?id=1488740
const USE_HTTPS = false;

// -------------------------------

const pkg = require('./package.json');
const build = (typeof process.env.BUILD !== 'undefined') ? process.env.BUILD : 'local';
const watch = process.env.ROLLUP_WATCH === 'true';
const watchFull = process.env.WATCH_FULL !== undefined;
console.log("build: " + build);
let basePath = '';
let entryPointURL = '';
let keyCloakServer = '';
let keyCloakBaseURL = '';
let keyCloakClientId = '';
let matomoSiteId = 131;
let useTerser = !watch || watchFull;
let useBabel = !watch || watchFull;

switch (build) {
  case 'local':
    basePath = '/dist/';
    entryPointURL = 'http://127.0.0.1:8000';
    keyCloakServer = 'auth-dev.tugraz.at';
    keyCloakBaseURL = 'https://' + keyCloakServer + '/auth';
    keyCloakClientId = 'auth-dev-mw-frontend-local';
    break;
  case 'development':
    basePath = '/apps/library/';
    entryPointURL = 'https://mw-dev.tugraz.at';
    keyCloakServer = 'auth-dev.tugraz.at';
    keyCloakBaseURL = 'https://' + keyCloakServer + '/auth';
    keyCloakClientId = 'auth-dev-mw-frontend';
    break;
  case 'demo':
    basePath = '/apps/library/';
    entryPointURL = 'https://api-demo.tugraz.at';
    keyCloakServer = 'auth-test.tugraz.at';
    keyCloakBaseURL = 'https://' + keyCloakServer + '/auth';
    keyCloakClientId = 'ibib-demo_tugraz_at-IBIB';
    break;
  case 'production':
    basePath = '/';
    entryPointURL = 'https://api.tugraz.at';
    keyCloakServer = 'auth.tugraz.at';
    keyCloakBaseURL = 'https://' + keyCloakServer + '/auth';
    keyCloakClientId = 'ibib_tugraz_at-IBIB';
    matomoSiteId = 130;
    break;
  case 'test':
    basePath = '/apps/library/';
    entryPointURL = '';
    keyCloakServer = '';
    keyCloakBaseURL = '';
    keyCloakClientId = '';
    break;
  default:
    console.error('Unknown build environment: ' + build);
    process.exit(1);
}

/**
 * Creates a server certificate and caches it in the .cert directory
 */
function generateTLSConfig() {
  fs.mkdirSync('.cert', {recursive: true});

  if (!fs.existsSync('.cert/server.key') || !fs.existsSync('.cert/server.cert')) {
    const attrs = [{name: 'commonName', value: 'vpu-dev.localhost'}];
    const pems = selfsigned.generate(attrs, {algorithm: 'sha256', days: 9999});
    fs.writeFileSync('.cert/server.key', pems.private);
    fs.writeFileSync('.cert/server.cert', pems.cert);
  }

  return {
    key: fs.readFileSync('.cert/server.key'),
    cert: fs.readFileSync('.cert/server.cert')
  }
}

function getBuildInfo() {
    const child_process = require('child_process');
    const url = require('url');

    let remote = child_process.execSync('git config --get remote.origin.url').toString().trim();
    let commit = child_process.execSync('git rev-parse --short HEAD').toString().trim();

    let parsed = url.parse(remote);
    // convert git urls
    if (parsed.protocol === null) {
        parsed = url.parse('git://' + remote.replace(":", "/"));
        parsed.protocol = 'https:';
    }
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
      'src/' + pkg.name + '.js',
      'src/vpu-library-shelving.js',
      'src/vpu-library-create-loan.js',
      'src/vpu-library-return-book.js',
      'src/vpu-library-renew-loan.js',
      'src/vpu-library-book-list.js',
      'src/vpu-library-loan-list.js',
      'src/vpu-library-order-list.js',
    ] : glob.sync('test/**/*.js'),
    output: {
      dir: 'dist',
      entryFileNames: '[name].js',
      chunkFileNames: 'shared/[name].[hash].[format].js',
      format: 'esm',
      sourcemap: true
    },
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
            getUrl: (p) => {
              return url.resolve(basePath, p);
            },
            getPrivateUrl: (p) => {
                return url.resolve(`${basePath}local/${pkg.name}/`, p);
            },
            name: pkg.name,
            entryPointURL: entryPointURL,
            keyCloakServer: keyCloakServer,
            keyCloakBaseURL: keyCloakBaseURL,
            keyCloakClientId: keyCloakClientId,
            environment: build,
            matomoSiteId: matomoSiteId,
            buildInfo: getBuildInfo()
          }
        }),
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
        useTerser ? terser({output: {comments: false}}) : false,
        copy({
            targets: [
                {src: 'assets/silent-check-sso.html', dest:'dist'},
                {src: 'assets/htaccess-shared', dest: 'dist/shared/', rename: '.htaccess'},
                {src: 'assets/*.css', dest: 'dist/local/' + pkg.name},
                {src: 'assets/*.ico', dest: 'dist/local/' + pkg.name},
                {src: 'assets/*.svg', dest: 'dist/local/' + pkg.name},
                {src: 'node_modules/source-sans-pro/WOFF2/OTF/*', dest: 'dist/local/' + pkg.name + '/fonts'},
                {src: 'node_modules/vpu-common/src/spinner.js', dest: 'dist/local/' + pkg.name, rename: 'spinner.js'},
                {src: 'node_modules/vpu-common/misc/browser-check.js', dest: 'dist/local/' + pkg.name, rename: 'browser-check.js'},
                {src: 'assets/icon-*.png', dest: 'dist/local/' + pkg.name},
                {src: 'assets/manifest.json', dest: 'dist', rename: pkg.name + '.manifest.json'},
                {src: 'assets/*.metadata.json', dest: 'dist'},
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
        useBabel && babel({
          include: [
              'src/**',
          ],
          babelHelpers: 'runtime',
          babelrc: false,
          presets: [[
            '@babel/preset-env', {
              loose: true,
              bugfixes: true,
              targets: {
                esmodules: true
              }
            }
          ]],
          plugins: [[
            '@babel/plugin-transform-runtime', {
              corejs: 3,
              useESModules: true
            }
          ],
          '@babel/plugin-syntax-dynamic-import',
          '@babel/plugin-syntax-import-meta']
        }),
        watch ? serve({
          contentBase: '.',
          host: '127.0.0.1',
          port: 8001,
          historyApiFallback: basePath + pkg.name + '.html',
          https: USE_HTTPS ? generateTLSConfig() : false,
          headers: {
              'Content-Security-Policy': `default-src 'self' 'unsafe-eval' 'unsafe-inline' analytics.tugraz.at ${keyCloakServer} ${entryPointURL}; img-src *`
          },
        }) : false
    ]
};
