import VPULitElementJQuery from 'vpu-common/vpu-lit-element-jquery';
import * as commonUtils from "vpu-common/utils";
import {html} from 'lit-element';

export default class VPULibraryLitElement extends VPULitElementJQuery {
    /**
     * Shows the user interface
     */
    initUserInterface() {
        // retry if we still need some time until the initialization
        if (window.VPUPerson === undefined || window.VPUPerson === null) {
            return false;
        }

        // return if the init was already done (no need for another retry)
        if (!this._('form').classList.contains("hidden")) {
            return true;
        }

        this.$('#login-error-block').hide();
        this._('form').classList.remove("hidden");

        if (!Array.isArray(window.VPUPerson.roles) || window.VPUPerson.roles.indexOf('ROLE_F_BIB_F') === -1) {
            // TODO: implement overlay with error message, we currently cannot hide the form because select2 doesn't seem to initialize properly if the web-component is invisible
            this.$('#permission-error-block').show();
            this.$('form').hide();
        }

        return true;
    }

    /**
     * Shows the user interface when logged in person object is available
     */
    callInitUserInterface() {
        if (window.VPUPerson === undefined) {
            // check if the currently logged-in user has the role "ROLE_F_BIB_F" set
            window.addEventListener("vpu-auth-person-init", () => { this.initUserInterface(); });
        }

        // fallback in the case that the vpu-auth-person-init event was already dispatched
        // we need to call it in a different function so we can access "this" in initUserInterface()
        commonUtils.pollFunc(() => { return this.initUserInterface(); }, 10000, 100);
    }
}
