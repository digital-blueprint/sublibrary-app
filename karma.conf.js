// Trick to use the auto-downloaded puppeteer chrome binary
process.env.CHROME_BIN = require('puppeteer').executablePath();

module.exports = function(config) {
  config.set({
    basePath: 'dist',
    frameworks: ['mocha'],
    files: [
      './**/*'
    ],
    autoWatch: true,
    browsers: ['ChromeHeadlessNoSandbox'],
    customLaunchers: {
      ChromeHeadlessNoSandbox: {
        base: 'ChromeHeadless',
        flags: ['--no-sandbox']
      }
    },
    singleRun: false,
    logLevel: config.LOG_ERROR
  });
}
