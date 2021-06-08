import path from 'path';
import url from 'url';
import glob from 'glob';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import copy from 'rollup-plugin-copy';
import {terser} from "rollup-plugin-terser";
import json from '@rollup/plugin-json';
import serve from 'rollup-plugin-serve';
import urlPlugin from "@rollup/plugin-url";
import license from 'rollup-plugin-license';
import del from 'rollup-plugin-delete';
import emitEJS from 'rollup-plugin-emit-ejs'
import {getBabelOutputPlugin} from '@rollup/plugin-babel';
import appConfig from './app.config.js';
import {getPackagePath, getBuildInfo, generateTLSConfig, getDistPath} from './vendor/toolkit/rollup.utils.js';

const pkg = require('./package.json');
const appEnv = (typeof process.env.APP_ENV !== 'undefined') ? process.env.APP_ENV : 'local';
const watch = process.env.ROLLUP_WATCH === 'true';
const buildFull = (!watch && appEnv !== 'test') || (process.env.FORCE_FULL !== undefined);
let useTerser = buildFull;
let useBabel = buildFull;
let checkLicenses = buildFull;
let useHTTPS = false;

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

function getOrigin(url) {
    if (url)
        return new URL(url).origin;
    return '';
}

config.CSP = `default-src 'self' 'unsafe-eval' 'unsafe-inline' \
${getOrigin(config.matomoUrl)} ${getOrigin(config.keyCloakBaseURL)} ${getOrigin(config.entryPointURL)}; img-src *`

export default (async () => {
    let privatePath = await getDistPath(pkg.name)
    return {
    input: (appEnv != 'test') ? glob.sync('src/dbp-library*.js') : glob.sync('test/**/*.js'),
    output: {
      dir: 'dist',
      entryFileNames: '[name].js',
      chunkFileNames: 'shared/[name].[hash].[format].js',
      format: 'esm',
      sourcemap: true
    },
    preserveEntrySignatures: false,
    onwarn: function (warning, warn) {
        // ignore chai warnings
        if (warning.code === 'CIRCULAR_DEPENDENCY' && warning.message.includes('/chai/')) {
          return;
        }
        warn(warning);
    },
    plugins: [
        del({
          targets: 'dist/*'
        }),
        emitEJS({
          src: 'assets',
          include: ['**/*.ejs', '**/.*.ejs'],
          data: {
            getUrl: (p) => {
                return url.resolve(config.basePath, p);
            },
            getPrivateUrl: (p) => {
                return url.resolve(`${config.basePath}${privatePath}/`, p);
            },
            name: pkg.internalName,
            entryPointURL: config.entryPointURL,
            keyCloakBaseURL: config.keyCloakBaseURL,
            keyCloakClientId: config.keyCloakClientId,
            matomoSiteId: config.matomoSiteId,
            matomoUrl: config.matomoUrl,
            CSP: config.CSP,
            buildInfo: getBuildInfo(appEnv),
            siteName: config.siteName,
            siteSubName: config.siteSubName
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
            await getPackagePath('suggestions', '**/*.css'),
            await getPackagePath('select2', '**/*.css'),
          ],
          emitFiles: true,
          fileName: 'shared/[name].[hash][extname]'
        }),
        useTerser ? terser() : false,
        copy({
            targets: [
                {src: 'assets/silent-check-sso.html', dest:'dist'},
                {src: 'assets/htaccess-shared', dest: 'dist/shared/', rename: '.htaccess'},
                {src: 'assets/*.css', dest: 'dist/' + await getDistPath(pkg.name)},
                {src: 'assets/*.ico', dest: 'dist/' + await getDistPath(pkg.name)},
                {src: 'assets/*.svg', dest: 'dist/' + await getDistPath(pkg.name)},
                {src: 'assets/icon-*.png', dest: 'dist/' + await getDistPath(pkg.name)},
                {src: 'assets/manifest.json', dest: 'dist', rename: pkg.internalName + '.manifest.json'},
                {src: 'assets/*.metadata.json', dest: 'dist'},
                {src: await getPackagePath('@dbp-toolkit/font-source-sans-pro', 'files/*'), dest: 'dist/' + await getDistPath(pkg.name, 'fonts/source-sans-pro')},
                {src: await getPackagePath('@dbp-toolkit/common', 'src/spinner.js'), dest: 'dist/' + await getDistPath(pkg.name)},
                {src: await getPackagePath('@dbp-toolkit/common', 'misc/browser-check.js'), dest: 'dist/' + await getDistPath(pkg.name)},
                {src: await getPackagePath('@dbp-toolkit/common', 'assets/icons/*.svg'), dest: 'dist/' + await getDistPath('@dbp-toolkit/common', 'icons')},
                {src: await getPackagePath('datatables.net-dt', 'css'), dest: 'dist/' + await getDistPath('@dbp-toolkit/data-table-view')},
                {src: await getPackagePath('datatables.net-dt', 'images'), dest: 'dist/' + await getDistPath('@dbp-toolkit/data-table-view')},
                {src: await getPackagePath('datatables.net-responsive-dt', 'css'), dest: 'dist/' + await getDistPath('@dbp-toolkit/data-table-view')},
                {src: await getPackagePath('datatables.net-buttons-dt', 'css'), dest: 'dist/' + await getDistPath('@dbp-toolkit/data-table-view')},
            ],
        }),
        useBabel && getBabelOutputPlugin({
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
        watch ? serve({
          contentBase: '.',
          host: '127.0.0.1',
          port: 8001,
          historyApiFallback: config.basePath + pkg.internalName + '.html',
          https: useHTTPS ? await generateTLSConfig() : false,
          headers: {
              'Content-Security-Policy': config.CSP
          },
        }) : false
    ]
};})();
