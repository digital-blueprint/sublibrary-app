import {LitElement} from "lit-element";
import {EventBus} from 'vpu-common';

export default class VPULibraryLitElement extends LitElement {

    _(selector) {
        return this.shadowRoot === null ? this.querySelector(selector) : this.shadowRoot.querySelector(selector);
    }

    hasLibraryPermissions() {
        return (window.VPUPerson && Array.isArray(window.VPUPerson.roles) && window.VPUPerson.roles.indexOf('ROLE_F_BIB_F') !== -1);
    }

    _updateAuth() {
        if (this.isLoggedIn() && !this._loginCalled) {
            this._loginCalled = true;
            this.loginCallback();
        }
    }

    connectedCallback() {
        super.connectedCallback();
        this._bus = new EventBus();

        this._loginCalled = false;

        this._updateAuth = this._updateAuth.bind(this);
        this._bus.subscribe('auth-update', this._updateAuth);
    }

    disconnectedCallback() {
        this._bus.close();

        super.disconnectedCallback();
    }

    isLoggedIn() {
        return (window.VPUPerson !== undefined && window.VPUPerson !== null);
    }

    loginCallback() {
        // Implement in subclass
        this.requestUpdate();
    }

    getScopedTagName(tagName) {
        if (this.constructor.getScopedTagName) {
            return this.constructor.getScopedTagName(tagName);
        }
        return tagName;
    }

    getOrganization() {
        const organizationSelect = this._(this.getScopedTagName("vpu-knowledge-base-organization-select"));

        if (organizationSelect) {
            const objectText = organizationSelect.getAttribute("data-object");

            if (objectText !== null) {
                return JSON.parse(objectText);
            }
        }

        return null;
    }

    getOrganizationCode() {
        const organization = this.getOrganization();

        return organization !== null ? organization.alternateName : "";
    }
}
