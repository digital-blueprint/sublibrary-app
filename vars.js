
switch(process.env.BUILD) {
    case "development":
        module.exports = {
            apiBaseUrl: 'https://mw-dev.tugraz.at',
            apiUrlPrefix: '/api',
            keyCloakClientId: 'auth-dev-mw-frontend',
        };

        break;
    case "production":
        module.exports = {
            apiBaseUrl: 'https://mw.tugraz.at',
            apiUrlPrefix: '/api',
            keyCloakClientId: 'auth-prod-mw-frontend',
        };
        break;
    default:
        module.exports = {
            apiBaseUrl: 'http://127.0.0.1:8000',
            apiUrlPrefix: '/api',
            keyCloakClientId: 'auth-dev-mw-frontend-local',
        };
}
