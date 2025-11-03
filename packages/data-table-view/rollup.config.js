import {globSync} from 'node:fs';
import url from 'url';
import serve from 'rollup-plugin-serve';
import emitEJS from 'rollup-plugin-emit-ejs';
import {getDistPath, assetPlugin} from '@dbp-toolkit/dev-utils';
import config from '../../vendor/toolkit/demo.common.config.js';
import {createRequire} from 'node:module';

const require = createRequire(import.meta.url);
const build = typeof process.env.BUILD !== 'undefined' ? process.env.BUILD : 'local';
console.log('build: ' + build);

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
            minify: build !== 'local' && build !== 'test',
            cleanDir: true,
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
            await assetPlugin(pkg.name, 'dist'),
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
