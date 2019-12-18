import VPULitElementJQuery from 'vpu-common/vpu-lit-element-jquery';
import * as events from 'vpu-common/events.js';

export default class VPULibraryLitElement extends VPULitElementJQuery {

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
}
