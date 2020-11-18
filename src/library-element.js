import {LitElement} from "lit-element";
import {EventBus} from '@dbp-toolkit/common';

export class LibraryElement extends LitElement {

    _(selector) {
        return this.shadowRoot === null ? this.querySelector(selector) : this.shadowRoot.querySelector(selector);
    }

    hasLibraryPermissions() {
        if (!window.DBPPerson || !Array.isArray(window.DBPPerson.roles))
            return false;

        let roles = window.DBPPerson.roles;
        // Remove ROLE_F_BIB_F once https://gitlab.tugraz.at/dbp/middleware/api/-/commit/e06e503a3fbe61ec328cf3f246140fb30f52a07e
        // is deployed
        return (roles.indexOf('ROLE_F_BIB_F') !== -1 || roles.indexOf('ROLE_LIBRARY_MANAGER') !== -1);
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
        return (window.DBPPerson !== undefined && window.DBPPerson !== null);
    }

    isLoading() {
        if (this._loginStatus === "logged-out")
            return false;
        return (!this.isLoggedIn() && window.DBPAuthToken !== undefined);
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
        const organizationSelect = this._(this.getScopedTagName("dbp-knowledge-base-organization-select"));

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
