import path from 'path';
import fs from 'fs';
import url from 'url';
import glob from 'glob';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import copy from 'rollup-plugin-copy';
import {terser} from "rollup-plugin-terser";
import json from '@rollup/plugin-json';
import serve from 'rollup-plugin-serve';
import urlPlugin from "@rollup/plugin-url";
// TODO: remove consts if "environment" isn't needed any more because "getAPiUrl" is removed
import consts from 'rollup-plugin-consts';
import license from 'rollup-plugin-license';
import del from 'rollup-plugin-delete';
import emitEJS from 'rollup-plugin-emit-ejs'
import babel from '@rollup/plugin-babel'
import selfsigned from 'selfsigned';
import {getBabelOutputPlugin} from '@rollup/plugin-babel';
import appConfig from './app.config.js';

// -------------------------------

// Some new web APIs are only available when HTTPS is active.
// Note that this only works with a Non-HTTPS API endpoint with Chrome,
// Firefox will emit CORS errors, see https://bugzilla.mozilla.org/show_bug.cgi?id=1488740
const USE_HTTPS = false;

// -------------------------------

const pkg = require('./package.json');
const appEnv = (typeof process.env.APP_ENV !== 'undefined') ? process.env.APP_ENV : 'local';
const watch = process.env.ROLLUP_WATCH === 'true';
const buildFull = (!watch && appEnv !== 'test') || (process.env.FORCE_FULL !== undefined);
let useTerser = buildFull;
let useBabel = buildFull;
let checkLicenses = buildFull;

console.log("APP_ENV: " + appEnv);

let config;
if (appEnv in appConfig) {
    config = appConfig[appEnv];
} else if (appEnv === 'test') {
    config = {
        basePath: '/',
        entryPointURL: 'https://test',
        keyCloakBaseURL: 'https://test',
        keyCloakClientId: '',
        matomoUrl: '',
        matomoSiteId: -1,
    };
} else {
    console.error(`Unknown build environment: '${appEnv}', use one of '${Object.keys(appConfig)}'`);
    process.exit(1);
}

config.keyCloakServer = new URL(config.keyCloakBaseURL).origin;

/**
 * Creates a server certificate and caches it in the .cert directory
 */
function generateTLSConfig() {
  fs.mkdirSync('.cert', {recursive: true});

  if (!fs.existsSync('.cert/server.key') || !fs.existsSync('.cert/server.cert')) {
    const attrs = [{name: 'commonName', value: 'dbp-dev.localhost'}];
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
        env: appEnv
    }
}

export default {
    input: (appEnv != 'test') ? [
      'src/' + pkg.name + '.js',
      'src/dbp-library-shelving.js',
      'src/dbp-library-create-loan.js',
      'src/dbp-library-return-book.js',
      'src/dbp-library-renew-loan.js',
      'src/dbp-library-book-list.js',
      'src/dbp-library-loan-list.js',
      'src/dbp-library-order-list.js',
      'src/dbp-library-budget.js',
    ] : glob.sync('test/**/*.js'),
    output: {
      dir: 'dist',
      entryFileNames: '[name].js',
      chunkFileNames: 'shared/[name].[hash].[format].js',
      format: 'esm',
      sourcemap: true
    },
    preserveEntrySignatures: false,
    onwarn: function (warning, warn) {
        // ignore "suggestions" warning re "use strict"
        if (warning.code === 'MODULE_LEVEL_DIRECTIVE') {
            return;
        }
        // ignore chai warnings
        if (warning.code === 'CIRCULAR_DEPENDENCY') {
          return;
        }
        warn(warning);
    },
    plugins: [
        del({
          targets: 'dist/*'
        }),
        // TODO: remove consts if "environment" isn't needed any more because "getAPiUrl" is removed
        consts({
          environment: appEnv,
        }),
        emitEJS({
          src: 'assets',
          include: ['**/*.ejs', '**/.*.ejs'],
          data: {
            getUrl: (p) => {
              return url.resolve(config.basePath, p);
            },
            getPrivateUrl: (p) => {
                return url.resolve(`${config.basePath}local/${pkg.name}/`, p);
            },
            name: pkg.name,
            entryPointURL: config.entryPointURL,
            keyCloakServer: config.keyCloakServer,
            keyCloakBaseURL: config.keyCloakBaseURL,
            keyCloakClientId: config.keyCloakClientId,
            environment: appEnv,
            matomoSiteId: config.matomoSiteId,
            matomoUrl: config.matomoUrl,
            buildInfo: getBuildInfo()
          }
        }),
        resolve({
          // ignore node_modules from vendored packages
          moduleDirectories: [path.join(process.cwd(), 'node_modules')]
        }),
        checkLicenses && license({
            banner: {
                commentStyle: 'ignored',
                content: `
License: <%= pkg.license %>
Dependencies:
<% _.forEach(dependencies, function (dependency) { if (dependency.name) { %>
<%= dependency.name %>: <%= dependency.license %><% }}) %>
`},
          thirdParty: {
            allow: {
              test: '(MIT OR BSD-3-Clause OR Apache-2.0 OR LGPL-2.1-or-later OR ISC )',
              failOnUnlicensed: true,
              failOnViolation: true,
            },
          },
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
        useTerser ? terser() : false,
        copy({
            targets: [
                {src: 'assets/silent-check-sso.html', dest:'dist'},
                {src: 'assets/htaccess-shared', dest: 'dist/shared/', rename: '.htaccess'},
                {src: 'assets/*.css', dest: 'dist/local/' + pkg.name},
                {src: 'assets/*.ico', dest: 'dist/local/' + pkg.name},
                {src: 'assets/*.svg', dest: 'dist/local/' + pkg.name},
                {src: 'node_modules/@dbp-toolkit/font-source-sans-pro/files/*', dest: 'dist/local/' + pkg.name + '/fonts/source-sans-pro'},
                {src: 'node_modules/@dbp-toolkit/common/src/spinner.js', dest: 'dist/local/' + pkg.name, rename: 'spinner.js'},
                {src: 'node_modules/@dbp-toolkit/common/misc/browser-check.js', dest: 'dist/local/' + pkg.name, rename: 'browser-check.js'},
                {src: 'assets/icon-*.png', dest: 'dist/local/' + pkg.name},
                {src: 'assets/manifest.json', dest: 'dist', rename: pkg.name + '.manifest.json'},
                {src: 'assets/*.metadata.json', dest: 'dist'},
                {src: 'node_modules/@dbp-toolkit/common/assets/icons/*.svg', dest: 'dist/local/@dbp-toolkit/common/icons'},
            ],
        }),
        copy({
            targets: [
                {src: 'node_modules/datatables.net-dt/css', dest: 'dist/local/@dbp-toolkit/data-table-view/'},
                {src: 'node_modules/datatables.net-dt/images', dest: 'dist/local/@dbp-toolkit/data-table-view/'},
                {src: 'node_modules/datatables.net-responsive-dt/css', dest: 'dist/local/@dbp-toolkit/data-table-view'},
                {src: 'node_modules/datatables.net-buttons-dt/css', dest: 'dist/local/@dbp-toolkit/data-table-view'},
            ],
        }),
        getBabelOutputPlugin({
            compact: false,
            presets: [[
                '@babel/preset-env', {
                  loose: true,
                  modules: false,
                  shippedProposals: true,
                  bugfixes: true,
                  targets: {
                    esmodules: true
                  }
                }
            ]]
          }),
        useBabel && 0 && babel({
          include: ['**'],
          exclude: ['**/*core-js*/**'],
          babelHelpers: 'bundled',
          babelrc: false,
          presets: [[
            '@babel/preset-env', {
              loose: true,
              shippedProposals: true,
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
          historyApiFallback: config.basePath + pkg.name + '.html',
          https: USE_HTTPS ? generateTLSConfig() : false,
          headers: {
              'Content-Security-Policy': `default-src 'self' 'unsafe-eval' 'unsafe-inline' analytics.tugraz.at ${config.keyCloakServer} ${config.entryPointURL}; img-src *`
          },
        }) : false
    ]
};
