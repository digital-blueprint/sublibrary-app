const { config } = require('../../vendor/e2e-test/config/base.conf.js');

exports.config = Object.assign(config, {

    username: 'test1',

    password: 'test2',

    //Use 'cat /etc/resolv.conf' to get the ip of the host
    hostname: '172.23.48.1',

    port: 4444,

    queryParams : {
        drivers: {
            chrome: { version: '80.0.3987.16' }
        }
    },

    capabilities: [{
        browserName: 'chrome',
        browserVersion: 'latest',
        platformName: 'Windows 10'
    }],

    specs: [
        './e2e-test/specs/change-language-fail.spec.js'
    ],

    baseUrl: 'http://localhost:8001',

    framework: 'mocha',
    mochaOpts: {
		ui: 'bdd',
        require: ['./e2e-test/babel-require.js'],
        timeout: 100000
	},
    
    reporters: ['spec'],

});