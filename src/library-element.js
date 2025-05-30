import {AdapterLitElement} from '@dbp-toolkit/common';
import * as errorUtils from '@dbp-toolkit/common/error';

export class LibraryElement extends AdapterLitElement {
    constructor() {
        super();
        Object.assign(LibraryElement.prototype, errorUtils.errorMixin);
    }

    _(selector) {
        return this.shadowRoot === null
            ? this.querySelector(selector)
            : this.shadowRoot.querySelector(selector);
    }

    hasLibraryPermissions() {
        if (!this.auth.person || !Array.isArray(this.auth.person.roles)) return false;

        let roles = this.auth.person.roles;
        return roles.indexOf('ROLE_LIBRARY_MANAGER') !== -1;
    }

    _updateAuth() {
        this._loginStatus = this.auth['login-status'];
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

    update(changedProperties) {
        changedProperties.forEach((oldValue, propName) => {
            switch (propName) {
                case 'auth':
                    this._updateAuth();
                    break;
            }
        });

        super.update(changedProperties);
    }

    connectedCallback() {
        super.connectedCallback();

        this._loginStatus = '';
        this._loginState = [];
        this._loginCalled = false;
    }

    isLoggedIn() {
        return this.auth.person !== undefined && this.auth.person !== null;
    }

    isLoading() {
        if (this._loginStatus === 'logged-out') return false;
        return !this.isLoggedIn() && this.auth.token !== undefined;
    }

    loginCallback() {
        // Implement in subclass
    }

    getOrganization() {
        const organizationSelect = this._('dbp-library-select');

        if (organizationSelect) {
            const objectText = organizationSelect.getAttribute('data-object');

            if (objectText !== null) {
                return JSON.parse(objectText);
            }
        }

        return null;
    }

    getOrganizationCode() {
        const organization = this.getOrganization();

        return organization !== null ? organization.name : '';
    }
}
