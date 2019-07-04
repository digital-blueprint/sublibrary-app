import {i18n} from './i18n.js';
import {html, LitElement} from 'lit-element';

/**
 * Keycloak auth web component
 * https://www.keycloak.org/docs/latest/securing_apps/index.html#_javascript_adapter
 *
 * Sets some global variables:
 *   window.VPUAuthSubject: Keycloak username
 *   window.VPUAuthToken: Keycloak token to send with your requests
 *   window.VPUUserFullName: Full name of the user
 */
class VPUAuth extends LitElement {
    constructor() {
        super();
        this.lang = 'de';
        this.clientId = "";
        this.keyCloakInitCalled = false;
        this._keycloak = null;
        this.token = "";
        this.subject = "";
        this.name = "";

        // Create the event
        this.initEvent = new CustomEvent("vpu-auth-init", { "detail": "KeyCloak init event" });
    }

    static get properties() {
        return {
            lang: { type: String },
            clientId: { type: String, attribute: 'client-id' },
            name: { type: String, attribute: false },
            token: { type: String, attribute: false },
            subject: { type: String, attribute: false },
            keycloak: { type: Object, attribute: false },
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
        console.log("loadKeyCloak");

        if (!this.keyCloakInitCalled) {
            const script = document.createElement('script');
            script.type = 'text/javascript';
            script.async = true;
            script.onload = function () {
                that.keyCloakInitCalled = true;

                that._keycloak = Keycloak({
                    url: 'https://auth-dev.tugraz.at/auth',
                    realm: 'tugraz',
                    clientId: that.clientId,
                });
                that._keycloak.init({onLoad: 'login-required'}).success(function (authenticated) {
                    console.log(authenticated ? 'authenticated' : 'not authenticated!');
                    console.log(that._keycloak);

                    that.name = that._keycloak.idTokenParsed.name;
                    that.token = that._keycloak.token;
                    that.subject = that._keycloak.subject;

                    window.VPUAuthSubject = that._keycloak.subject;
                    window.VPUAuthToken = that._keycloak.token;
                    window.VPUUserFullName = that._keycloak.idTokenParsed.name;

                    document.dispatchEvent(that.initEvent);
                }).error(function () {
                    console.log('failed to initialize');
                });
            };

            // https://www.keycloak.org/docs/latest/securing_apps/index.html#_javascript_a
            script.src = '//auth-dev.tugraz.at/auth/js/keycloak.js';

            //Append it to the document header
            document.head.appendChild(script);
        }
    }

    logout(e) {
        this._keycloak.logout();
    }

    render() {
        return html`
            <strong>VPU Auth</strong><br />
            <p>name: ${this.name}</p>
            <button @click="${this.logout}">Logout</button>
        `;
    }
}

customElements.define('vpu-auth', VPUAuth);
