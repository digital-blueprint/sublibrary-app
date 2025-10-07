import {globSync} from 'glob';
import url from 'url';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import copy from 'rollup-plugin-copy';
import terser from '@rollup/plugin-terser';
import serve from 'rollup-plugin-serve';
import urlPlugin from '@rollup/plugin-url';
import del from 'rollup-plugin-delete';
import json from '@rollup/plugin-json';
import emitEJS from 'rollup-plugin-emit-ejs';
import {getPackagePath, getDistPath} from '@dbp-toolkit/dev-utils';
import config from '../../vendor/toolkit/demo.common.config.js';
import {createRequire} from 'node:module';

const require = createRequire(import.meta.url);
const build = typeof process.env.BUILD !== 'undefined' ? process.env.BUILD : 'local';
console.log('build: ' + build);
let isRolldown = process.argv.some((arg) => arg.includes('rolldown'));

const pkg = require('./package.json');
const basePath = '/dist/';
const appName = 'dbp-data-table-view';

export default (async () => {
    let privatePath = await getDistPath(pkg.name);
    return {
        input:
            build != 'test'
                ? ['src/' + appName + '.js', 'src/' + appName + '-demo.js']
                : globSync('test/**/*.js'),
        output: {
            dir: 'dist',
            entryFileNames: '[name].js',
            chunkFileNames: 'shared/[name].[hash].js',
            format: 'esm',
            sourcemap: true,
        },
        onwarn: function (warning, warn) {
            // keycloak bundled code uses eval
            if (warning.code === 'EVAL' && warning.id.includes('sha256.js')) {
                return;
            }
            warn(warning);
        },
        moduleTypes: {
            '.css': 'js', // work around rolldown handling the CSS import before the URL plugin can
        },
        plugins: [
            del({
                targets: 'dist/*',
            }),
            emitEJS({
                src: 'assets',
                include: ['**/*.ejs', '**/.*.ejs'],
                data: {
                    getUrl: (p) => {
                        return url.resolve(basePath, p);
                    },
                    getPrivateUrl: (p) => {
                        return url.resolve(`${basePath}${privatePath}/`, p);
                    },
                    name: appName,
                    entryPointURL: config.entryPointURL,
                    keyCloakBaseURL: config.keyCloakBaseURL,
                    keyCloakRealm: config.keyCloakRealm,
                    keyCloakClientId: config.keyCloakClientId,
                },
            }),
            !isRolldown && resolve(),
            !isRolldown && commonjs(),
            !isRolldown && json(),
            urlPlugin({
                limit: 0,
                emitFiles: true,
                fileName: 'shared/[name].[hash][extname]',
            }),
            build !== 'local' && build !== 'test' ? terser() : false,
            copy({
                targets: [
                    {
                        src: await getPackagePath('@dbp-toolkit/common', 'assets/icons/*.svg'),
                        dest: 'dist/' + (await getDistPath('@dbp-toolkit/common', 'icons')),
                    },
                    {
                        src: await getPackagePath('datatables.net-dt', 'css'),
                        dest: 'dist/' + (await getDistPath(pkg.name)),
                    },
                    {
                        src: await getPackagePath('datatables.net-dt', 'images'),
                        dest: 'dist/' + (await getDistPath(pkg.name)),
                    },
                    {
                        src: await getPackagePath('datatables.net-responsive-dt', 'css'),
                        dest: 'dist/' + (await getDistPath(pkg.name)),
                    },
                    {
                        src: await getPackagePath('datatables.net-buttons-dt', 'css'),
                        dest: 'dist/' + (await getDistPath(pkg.name)),
                    },
                ],
            }),
            process.env.ROLLUP_WATCH === 'true'
                ? serve({
                      contentBase: '.',
                      historyApiFallback: basePath + 'index.html',
                      host: '127.0.0.1',
                      port: 8002,
                  })
                : false,
        ],
    };
})();
