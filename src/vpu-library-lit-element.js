import VPULitElementJQuery from 'vpu-common/vpu-lit-element-jquery';
import * as commonUtils from "vpu-common/utils";

export default class VPULibraryLitElement extends VPULitElementJQuery {

    hasLibraryPermissions() {
        return (window.VPUPerson && Array.isArray(window.VPUPerson.roles) && window.VPUPerson.roles.indexOf('ROLE_F_BIB_F') !== -1);
    }

    connectedCallback() {
        super.connectedCallback();

        this.updateComplete.then(()=>{
            // show user interface when logged in person object is available
            this.callInitUserInterface();
        });
    }

    isLoggedIn() {
        return (window.VPUPerson !== undefined && window.VPUPerson !== null);
    }

    loginCallback() {
        // Implement in subclass
        this.requestUpdate();
    }

    /**
     * Shows the user interface when logged in person object is available
     */
    callInitUserInterface() {
        // fallback in the case that the vpu-auth-person-init event was already dispatched
        // we need to call it in a different function so we can access "this" in initUserInterface()
        commonUtils.pollFunc(() => {
            if (this.isLoggedIn()) {
                this.loginCallback();
                return true;
            }
            return false;
        }, 10000, 100);
    }
}
