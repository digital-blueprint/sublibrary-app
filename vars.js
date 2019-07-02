
switch(process.env.BUILD) {
    case "development":
        module.exports = {
            apiBaseUrl: 'https://mw-dev.tugraz.at',
            apiUrlPrefix: '/api',
        };

        break;
    case "production":
        module.exports = {
            apiBaseUrl: 'https://mw.tugraz.at',
            apiUrlPrefix: '/api',
        };
        break;
    default:
        module.exports = {
            apiBaseUrl: 'http://127.0.0.1:8000',
            apiUrlPrefix: '/api',
        };
}
