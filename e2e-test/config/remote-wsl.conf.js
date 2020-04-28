const { config } = require('../../vendor/e2e-test/config/base.conf.js');

exports.config = Object.assign(config, {
    
    username: process.env.TUGrazTestUsername,

    password: process.env.TUGrazTestPassword,

    //Use 'cat /etc/resolv.conf' to get the ip of the host
    hostname: '172.19.32.1',

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
        './e2e-test/specs/tests/library-create-loan.spec.js'
    ],

    baseUrl: 'http://localhost:8001',

    framework: 'mocha',
    mochaOpts: {
		ui: 'bdd',
        require: ['./e2e-test/babel-require.js'],
        timeout: 200000
    },
    
    reporters: ['spec'],

});