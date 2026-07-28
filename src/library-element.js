import {AdapterLitElement, AuthMixin} from '@dbp-toolkit/common';
import * as errorUtils from '@dbp-toolkit/common/error';

export class LibraryElement extends AuthMixin(AdapterLitElement) {
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

    logoutCallback() {
        // Forget what we know, so it gets looked up again on the next login
        this._hasLibraryPermissions = null;
        this._libraryPermissionsRequested = false;
    }

    update(changedProperties) {
        this._maybeUpdateLibraryPermissions();

        super.update(changedProperties);
    }

    connectedCallback() {
        super.connectedCallback();

        // null means we don't know yet if the user manages any sublibrary
        this._hasLibraryPermissions = null;
        this._libraryPermissionsRequested = false;
    }

    isLoading() {
        if (this.isAuthPending()) return true;
        if (!this.isLoggedIn()) return false;
        // Keep loading until we know if the user manages any sublibrary
        return this._hasLibraryPermissions === null;
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
