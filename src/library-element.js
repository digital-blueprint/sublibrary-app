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

    /**
     * Whether the user manages at least one sublibrary, i.e. whether the sublibrary
     * selector has any entries. Returns false as long as this isn't known yet.
     *
     * @returns {boolean} true if the user has access to at least one sublibrary
     */
    hasLibraryPermissions() {
        return this._hasLibraryPermissions === true;
    }

    /**
     * Fetches the sublibraries the user manages, so we know whether the user is
     * allowed to use the app at all.
     */
    async _updateLibraryPermissions() {
        let hasPermissions = false;

        try {
            const url = new URL('sublibrary/sublibraries', this.entryPointUrl);
            // We only need to know if there is at least one entry
            url.searchParams.set('perPage', '1');

            const response = await fetch(url.href, {
                headers: {
                    'Content-Type': 'application/ld+json',
                    Authorization: 'Bearer ' + this.auth.token,
                },
            });
            if (!response.ok) throw response;

            const data = await response.json();
            hasPermissions = (data['hydra:member'] ?? []).length > 0;
        } catch (error) {
            console.error('Failed to fetch the sublibraries of the user', error);
        }

        this._hasLibraryPermissions = hasPermissions;
        this.requestUpdate();
    }

    /**
     * Starts the sublibrary lookup as soon as we are logged in and know the API entry point.
     */
    _maybeUpdateLibraryPermissions() {
        if (this._libraryPermissionsRequested) return;
        if (!this.isLoggedIn() || !this.entryPointUrl) return;

        this._libraryPermissionsRequested = true;
        this._updateLibraryPermissions();
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

        this._maybeUpdateLibraryPermissions();

        super.update(changedProperties);
    }

    connectedCallback() {
        super.connectedCallback();

        this._loginStatus = '';
        this._loginState = [];
        this._loginCalled = false;
        // null means we don't know yet if the user manages any sublibrary
        this._hasLibraryPermissions = null;
        this._libraryPermissionsRequested = false;
    }

    isLoggedIn() {
        return this.auth.person !== undefined && this.auth.person !== null;
    }

    isLoading() {
        if (this._loginStatus === 'logged-out') return false;
        if (!this.isLoggedIn()) return this.auth.token !== undefined;
        // Keep loading until we know if the user manages any sublibrary
        return this._hasLibraryPermissions === null;
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
