const { config } = require('../../vendor/e2e-test/config/base.conf.js');

var browserstack = require('browserstack-local');

exports.config = Object.assign(config, {
	
    user: 'xxx',
    key: 'xxx',
    
    browserstackLocal: true,
    
    connectionRetryTimeout: 90000,
    
    specs: [
        './specs/change-language.spec.js'
    ],

    capabilities: [{
        browser: 'chrome',
        name: 'End2End Testing',
        'project': 'Library Application',
        'build' : 'End2End Testing',
        'browserstack.local': 'true',
        'browserstack.debug': 'true',
    }],
    
    baseUrl: 'http://localhost:8001',
    
    services: ['browserstack'],
    
    framework: 'mocha',
    mochaOpts: {
		ui: 'bdd',
		require: ['@babel/register']
	},
    
    reporters: ['spec'],
    
    // =====
    // Hooks
    // =====
    
    // Code to start browserstack local before start of test
    onPrepare: function (config, capabilities) {
        console.log("Connecting local");
        return new Promise(function(resolve, reject){
            exports.bs_local = new browserstack.Local();
            exports.bs_local.start({'key': exports.config.key }, function(error) {
                if (error) return reject(error);
                console.log('Connected. Now testing...');

                resolve();
            });
        });
    },
    
    // Code to stop browserstack local after end of test
    onComplete: function (capabilties, specs) {
        exports.bs_local.stop(function() {});
    },
 
});
