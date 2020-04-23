import {LitElement} from "lit-element";
import * as events from 'vpu-common/events.js';

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

        this._loginCalled = false;
        this._subscriber = new events.EventSubscriber('vpu-auth-update', 'vpu-auth-update-request');
        this._updateAuth = this._updateAuth.bind(this);
        this._subscriber.subscribe(this._updateAuth);
    }

    disconnectedCallback() {
        this._subscriber.unsubscribe(this._updateAuth);
        delete this._subscriber;

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
