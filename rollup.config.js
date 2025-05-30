import url from 'node:url';
import process from 'node:process';
import {globSync} from 'glob';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import copy from 'rollup-plugin-copy';
import terser from '@rollup/plugin-terser';
import json from '@rollup/plugin-json';
import serve from 'rollup-plugin-serve';
import urlPlugin from '@rollup/plugin-url';
import license from 'rollup-plugin-license';
import del from 'rollup-plugin-delete';
import emitEJS from 'rollup-plugin-emit-ejs';
import {getBabelOutputPlugin} from '@rollup/plugin-babel';
import {getPackagePath, getBuildInfo, generateTLSConfig, getDistPath} from '@dbp-toolkit/dev-utils';
import {createRequire} from 'node:module';

const require = createRequire(import.meta.url);
const pkg = require('./package.json');
const appEnv = typeof process.env.APP_ENV !== 'undefined' ? process.env.APP_ENV : 'local';
const watch = process.env.ROLLUP_WATCH === 'true';
const buildFull = (!watch && appEnv !== 'test') || process.env.FORCE_FULL !== undefined;
let useTerser = buildFull;
let useBabel = buildFull;
let checkLicenses = buildFull;
let treeshake = buildFull;
let useHTTPS = false;
// if true, app assets and configs are whitelabel
let whitelabel;
// path to non whitelabel assets and configs
let customAssetsPath;
// development path
let devPath = 'assets_custom/dbp-sublibrary/assets/';
// deployment path
let deploymentPath = '../';

// set whitelabel bool according to used environment
if (
    (appEnv.length > 6 && appEnv.substring(appEnv.length - 6) == 'Custom') ||
    appEnv == 'production'
) {
    whitelabel = false;
} else {
    whitelabel = true;
}

// load devconfig for local development if present
let devConfig = require('./app.config.json');
try {
    console.log('Loading ' + './' + devPath + 'app.config.json ...');
    devConfig = require('./' + devPath + 'app.config.json');
    customAssetsPath = devPath;
} catch (e) {
    if (e.code == 'MODULE_NOT_FOUND') {
        console.warn('no dev-config found, try deployment config instead ...');

        // load devconfig for deployment if present
        try {
            console.log('Loading ' + './' + deploymentPath + 'app.config.json ...');
            devConfig = require('./' + deploymentPath + 'app.config.json');
            customAssetsPath = deploymentPath;
        } catch (e) {
            if (e.code == 'MODULE_NOT_FOUND') {
                console.warn('no dev-config found, use default whitelabel config instead ...');
                devConfig = require('./app.config.json');
                customAssetsPath = devPath;
            } else {
                throw e;
            }
        }
    } else {
        throw e;
    }
}

console.log('APP_ENV: ' + appEnv);

let config;
if (devConfig != undefined && appEnv in devConfig) {
    config = devConfig[appEnv];
} else if (appEnv === 'test') {
    config = {
        basePath: '/',
        entryPointURL: 'https://test',
        keyCloakBaseURL: 'https://test',
        keyCloakRealm: '',
        keyCloakClientId: '',
        matomoUrl: '',
        matomoSiteId: -1,
    };
} else {
    console.error(`Unknown build environment: '${appEnv}', use one of '${Object.keys(devConfig)}'`);
    process.exit(1);
}

function getOrigin(url) {
    if (url) return new URL(url).origin;
    return '';
}

config.CSP = `default-src 'self' 'unsafe-inline' \
${getOrigin(config.matomoUrl)} ${getOrigin(config.keyCloakBaseURL)} ${getOrigin(
    config.entryPointURL,
)}; img-src * blob: data:`;

export default (async () => {
    let privatePath = await getDistPath(pkg.name);
    return {
        input:
            appEnv != 'test'
                ? !whitelabel
                    ? [
                          'src/dbp-sublibrary.js',
                          'src/dbp-sublibrary-book-list.js',
                          'src/dbp-sublibrary-budget.js',
                          'src/dbp-sublibrary-create-loan.js',
                          'src/dbp-sublibrary-loan-list.js',
                          'src/dbp-sublibrary-order-list.js',
                          'src/dbp-sublibrary-renew-loan.js',
                          'src/dbp-sublibrary-return-book.js',
                          'src/dbp-sublibrary-shelving.js',
                          await getPackagePath('@tugraz/web-components', 'src/logo.js'),
                      ]
                    : [
                          'src/dbp-sublibrary.js',
                          'src/dbp-sublibrary-book-list.js',
                          'src/dbp-sublibrary-budget.js',
                          'src/dbp-sublibrary-create-loan.js',
                          'src/dbp-sublibrary-loan-list.js',
                          'src/dbp-sublibrary-order-list.js',
                          'src/dbp-sublibrary-renew-loan.js',
                          'src/dbp-sublibrary-return-book.js',
                          'src/dbp-sublibrary-shelving.js',
                      ]
                : globSync('test/**/*.js'),
        output: {
            dir: 'dist',
            entryFileNames: '[name].js',
            chunkFileNames: 'shared/[name].[hash].[format].js',
            format: 'esm',
            sourcemap: true,
        },
        treeshake: treeshake,
        plugins: [
            del({
                targets: 'dist/*',
            }),
            whitelabel &&
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
                        keyCloakRealm: config.keyCloakRealm,
                        keyCloakClientId: config.keyCloakClientId,
                        matomoSiteId: config.matomoSiteId,
                        matomoUrl: config.matomoUrl,
                        CSP: config.CSP,
                        buildInfo: getBuildInfo(appEnv),
                        shortName: config.shortName,
                    },
                }),
            !whitelabel &&
                emitEJS({
                    src: customAssetsPath,
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
                        keyCloakRealm: config.keyCloakRealm,
                        keyCloakClientId: config.keyCloakClientId,
                        matomoSiteId: config.matomoSiteId,
                        matomoUrl: config.matomoUrl,
                        CSP: config.CSP,
                        buildInfo: getBuildInfo(appEnv),
                        shortName: config.shortName,
                    },
                }),
            resolve({
                browser: true,
            }),
            checkLicenses &&
                license({
                    banner: {
                        commentStyle: 'ignored',
                        content: `
License: <%= pkg.license %>
Dependencies:
<% _.forEach(dependencies, function (dependency) { if (dependency.name) { %>
<%= dependency.name %>: <%= dependency.license %><% }}) %>
`,
                    },
                    thirdParty: {
                        allow(dependency) {
                            let licenses = [
                                'LGPL-2.1-or-later',
                                'MIT',
                                'BSD-3-Clause',
                                'Apache-2.0',
                                'BSD',
                                '(MIT OR GPL-3.0-or-later)',
                                '(MIT)',
                                'ISC',
                            ];
                            if (!licenses.includes(dependency.license)) {
                                throw new Error(
                                    `Unknown license for ${dependency.name}: ${dependency.license}`,
                                );
                            }
                            return true;
                        },
                    },
                }),
            commonjs({
                include: 'node_modules/**',
            }),
            json(),
            urlPlugin({
                limit: 0,
                include: [
                    await getPackagePath('suggestions', '**/*.css'),
                    await getPackagePath('select2', '**/*.css'),
                ],
                emitFiles: true,
                fileName: 'shared/[name].[hash][extname]',
            }),
            useTerser ? terser() : false,
            whitelabel &&
                copy({
                    targets: [
                        {src: 'assets/silent-check-sso.html', dest: 'dist'},
                        {src: 'assets/htaccess-shared', dest: 'dist/shared/', rename: '.htaccess'},
                        {src: 'assets/*.css', dest: 'dist/' + (await getDistPath(pkg.name))},
                        {src: 'assets/*.svg', dest: 'dist/' + (await getDistPath(pkg.name))},
                        {
                            src: 'assets/icon/*',
                            dest: 'dist/' + (await getDistPath(pkg.name, 'icon')),
                        },
                        {
                            src: 'assets/site.webmanifest',
                            dest: 'dist',
                            rename: pkg.internalName + '.webmanifest',
                        },
                        {src: 'assets/*.metadata.json', dest: 'dist'},
                        {
                            src: await getPackagePath('@fontsource/nunito-sans', '*'),
                            dest: 'dist/' + (await getDistPath(pkg.name, 'fonts/nunito-sans')),
                        },
                        {
                            src: await getPackagePath('@dbp-toolkit/common', 'src/spinner.js'),
                            dest: 'dist/' + (await getDistPath(pkg.name)),
                            rename: 'org_spinner.js',
                        },
                        {
                            src: await getPackagePath('@dbp-toolkit/common', 'src/spinner.js'),
                            dest: 'dist/' + (await getDistPath(pkg.name)),
                        },
                        {
                            src: await getPackagePath(
                                '@dbp-toolkit/common',
                                'misc/browser-check.js',
                            ),
                            dest: 'dist/' + (await getDistPath(pkg.name)),
                        },
                        {
                            src: await getPackagePath('@dbp-toolkit/common', 'assets/icons/*.svg'),
                            dest: 'dist/' + (await getDistPath('@dbp-toolkit/common', 'icons')),
                        },
                        {
                            src: await getPackagePath('datatables.net-dt', 'css'),
                            dest: 'dist/' + (await getDistPath('@dbp-toolkit/data-table-view')),
                        },
                        {
                            src: await getPackagePath('datatables.net-dt', 'images'),
                            dest: 'dist/' + (await getDistPath('@dbp-toolkit/data-table-view')),
                        },
                        {
                            src: await getPackagePath('datatables.net-responsive-dt', 'css'),
                            dest: 'dist/' + (await getDistPath('@dbp-toolkit/data-table-view')),
                        },
                        {
                            src: await getPackagePath('datatables.net-buttons-dt', 'css'),
                            dest: 'dist/' + (await getDistPath('@dbp-toolkit/data-table-view')),
                        },
                    ],
                }),
            !whitelabel &&
                copy({
                    targets: [
                        {src: customAssetsPath + 'silent-check-sso.html', dest: 'dist'},
                        {
                            src: customAssetsPath + 'htaccess-shared',
                            dest: 'dist/shared/',
                            rename: '.htaccess',
                        },
                        {
                            src: customAssetsPath + '*.css',
                            dest: 'dist/' + (await getDistPath(pkg.name)),
                        },
                        {
                            src: customAssetsPath + '*.svg',
                            dest: 'dist/' + (await getDistPath(pkg.name)),
                        },
                        {
                            src: customAssetsPath + 'icon/*',
                            dest: 'dist/' + (await getDistPath(pkg.name, 'icon')),
                        },
                        {
                            src: customAssetsPath + 'site.webmanifest',
                            dest: 'dist',
                            rename: pkg.internalName + '.webmanifest',
                        },
                        {src: customAssetsPath + '*.metadata.json', dest: 'dist'},
                        {
                            src: await getPackagePath('@tugraz/font-source-sans-pro', 'files/*'),
                            dest: 'dist/' + (await getDistPath(pkg.name, 'fonts/source-sans-pro')),
                        },
                        {
                            src: await getPackagePath('@tugraz/web-components', 'src/spinner.js'),
                            dest: 'dist/' + (await getDistPath(pkg.name)),
                            rename: 'tug_spinner.js',
                        },
                        {
                            src: await getPackagePath('@dbp-toolkit/common', 'src/spinner.js'),
                            dest: 'dist/' + (await getDistPath(pkg.name)),
                        },
                        {
                            src: await getPackagePath(
                                '@dbp-toolkit/common',
                                'misc/browser-check.js',
                            ),
                            dest: 'dist/' + (await getDistPath(pkg.name)),
                        },
                        {
                            src: await getPackagePath('@dbp-toolkit/common', 'assets/icons/*.svg'),
                            dest: 'dist/' + (await getDistPath('@dbp-toolkit/common', 'icons')),
                        },
                        {
                            src: await getPackagePath('datatables.net-dt', 'css'),
                            dest: 'dist/' + (await getDistPath('@dbp-toolkit/data-table-view')),
                        },
                        {
                            src: await getPackagePath('datatables.net-dt', 'images'),
                            dest: 'dist/' + (await getDistPath('@dbp-toolkit/data-table-view')),
                        },
                        {
                            src: await getPackagePath('datatables.net-responsive-dt', 'css'),
                            dest: 'dist/' + (await getDistPath('@dbp-toolkit/data-table-view')),
                        },
                        {
                            src: await getPackagePath('datatables.net-buttons-dt', 'css'),
                            dest: 'dist/' + (await getDistPath('@dbp-toolkit/data-table-view')),
                        },
                    ],
                }),
            useBabel &&
                getBabelOutputPlugin({
                    compact: false,
                    presets: [
                        [
                            '@babel/preset-env',
                            {
                                loose: false,
                                modules: false,
                                shippedProposals: true,
                                bugfixes: true,
                                targets: {
                                    esmodules: true,
                                },
                            },
                        ],
                    ],
                }),
            watch
                ? serve({
                      contentBase: '.',
                      host: '127.0.0.1',
                      port: 8001,
                      historyApiFallback: config.basePath + pkg.internalName + '.html',
                      https: useHTTPS ? await generateTLSConfig() : false,
                      headers: {
                          'Content-Security-Policy': config.CSP,
                      },
                  })
                : false,
        ],
    };
})();
