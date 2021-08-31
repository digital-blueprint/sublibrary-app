export default {
    local: {
        basePath: '/dist/',
        entryPointURL: 'http://127.0.0.1:8000',
        keyCloakBaseURL: 'https://auth-dev.tugraz.at/auth',
        keyCloakRealm: 'tugraz-vpu',
        keyCloakClientId: 'auth-dev-mw-frontend-local',
        matomoUrl: 'https://analytics.tugraz.at/',
        matomoSiteId: 131
    },
    development: {
        basePath: '/apps/library/',
        entryPointURL: 'https://api-dev.tugraz.at',
        keyCloakBaseURL: 'https://auth-dev.tugraz.at/auth',
        keyCloakRealm: 'tugraz-vpu',
        keyCloakClientId: 'dbp-library',
        matomoUrl: 'https://analytics.tugraz.at/',
        matomoSiteId: 131
    },
    demo: {
        basePath: '/apps/library/',
        entryPointURL: 'https://api-demo.tugraz.at',
        keyCloakBaseURL: 'https://auth-demo.tugraz.at/auth',
        keyCloakRealm: 'tugraz-vpu',
        keyCloakClientId: 'dbp-library',
        matomoUrl: 'https://analytics.tugraz.at/',
        matomoSiteId: 131
    },
    production: {
        basePath: '/',
        entryPointURL: 'https://api.tugraz.at',
        keyCloakBaseURL: 'https://auth.tugraz.at/auth',
        keyCloakRealm: 'tugraz',
        keyCloakClientId: 'ibib_tugraz_at-IBIB',
        matomoUrl: 'https://analytics.tugraz.at/',
        matomoSiteId: 130
    },
};