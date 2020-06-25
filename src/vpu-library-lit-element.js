import {LitElement} from "lit-element";
import {EventBus} from 'vpu-common';

export default class VPULibraryLitElement extends LitElement {

    _(selector) {
        return this.shadowRoot === null ? this.querySelector(selector) : this.shadowRoot.querySelector(selector);
    }

    hasLibraryPermissions() {
        return (window.VPUPerson && Array.isArray(window.VPUPerson.roles) && window.VPUPerson.roles.indexOf('ROLE_F_BIB_F') !== -1);
    }



    _updateAuth(e) {
        this._loginStatus = e.status;
        // Every time isLoggedIn()/isLoading() return something different we request a re-render
        let newLoginState = [this.isLoggedIn(), this.isLoading()];
        if (this._loginState.toString() !== newLoginState.toString()) {
            this.requestUpdate();
        }
        this._loginState = newLoginState;

        if (this.isLoggedIn() && !this._loginCalled) {
            this._loginCalled = true;
            this.loginCallback();
        }
    }

    connectedCallback() {
        super.connectedCallback();

        this._loginStatus = '';
        this._loginState = [];
        this._loginCalled = false;
        this._bus = new EventBus();
        this._bus.subscribe('auth-update', this._updateAuth.bind(this));
    }

    disconnectedCallback() {
        this._bus.close();

        super.disconnectedCallback();
    }

    isLoggedIn() {
        return (window.VPUPerson !== undefined && window.VPUPerson !== null);
    }

    isLoading() {
        if (this._loginStatus === "logged-out")
            return false;
        return (!this.isLoggedIn() && window.VPUAuthToken !== undefined);
    }

    loginCallback() {
        // Implement in subclass
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
