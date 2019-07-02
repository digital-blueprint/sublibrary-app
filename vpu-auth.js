import {i18n} from './i18n.js';
import {html, LitElement} from 'lit-element';

class VPUAuth extends LitElement {
    constructor() {
        super();
        this.lang = 'de';
        this.keyCloakInitCalled = false;
    }

    static get properties() {
        return {
            lang: { type: String },
        };
    }

    connectedCallback() {
        super.connectedCallback();
        i18n.changeLanguage(this.lang);

        this.loadKeyCloak();

        this.updateComplete.then(()=>{
        });
    }

    loadKeyCloak() {
        const that = this;

        window.console.log("loadKeyCloak");
        console.log("loadKeyCloak");
        console.log(this.keyCloakInitCalled);

        if (!this.keyCloakInitCalled) {
            const script = document.createElement('script');
            script.type = 'text/javascript';
            script.async = true;
            script.onload = function () {
                that.keyCloakInitCalled = true;

                const keycloak = Keycloak({
                    url: 'https://auth-dev.tugraz.at/auth',
                    realm: 'tugraz',
                    // TODO: make this a property
                    clientId: 'auth-dev-mw-frontend',
                });
                keycloak.init({onLoad: 'login-required'}).success(function (authenticated) {
                    console.log(authenticated ? 'authenticated!' : 'not authenticated!');

                    // TODO: get keycloak instance
                    console.log(keycloak.idTokenParsed);
                    console.log(keycloak.idTokenParsed.perferred_username);
                }).error(function () {
                    console.log('failed to initialize');
                });

                // TODO: use this
                console.log(keycloak);
                console.log(keycloak.idTokenParsed);
                console.log(keycloak.idTokenParsed.perferred_username);
            };

            // https://www.keycloak.org/docs/latest/securing_apps/index.html#_javascript_a
            script.src = '//auth-dev.tugraz.at/auth/js/keycloak.js';

            //Append it to the document header
            document.head.appendChild(script);
        }
    }

    render() {
        // TODO: implement logout button
        return html`
            <strong>VPU Auth</strong><br />
            <button>Logout</button>
        `;
    }
}

customElements.define('vpu-auth', VPUAuth);
