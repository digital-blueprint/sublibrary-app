//import $ from 'jquery';
import {i18n} from './i18n.js';
import {css, html} from 'lit-element';
import {send as notify} from 'vpu-notification';
import * as commonUtils from 'vpu-common/utils';
import * as commonStyles from 'vpu-common/styles';
import * as errorUtils from "vpu-common/error";
import VPULitElement from "vpu-common/vpu-lit-element";
import * as utils from "./utils";

class SelectInstitute extends VPULitElement {
    constructor() {
        super();
        this.lang = 'de';
        this.select = null;
        this.institutes = [];
        this.institute = 0;
    }

    static get properties() {
        return {
            lang: {type: String},
            select: {type: Object, attribute: false},
            institutes: {type: Array, attribute: false},
            institute: {type: String, attribute: false},
        }
    }

    connectedCallback() {
        super.connectedCallback();

        this.updateComplete.then(()=> {
            this.select = this._('#select-1');
            window.addEventListener("vpu-auth-person-init", () => {
                this.institutes = this.getAssosiatedInstitutes();
                this.institute = this.institutes.length > 0 ? this.institutes[0] : '';
                window.VPUPersonLibrary = this.institute;
                console.log('(init) window.VPUPersonLibrary = ' + window.VPUPersonLibrary);
            });
        });
    }

    update(changedProperties) {
        changedProperties.forEach((oldValue, propName) => {
            if (propName === "lang") {
                i18n.changeLanguage(this.lang);
            }
        });

        super.update(changedProperties);
    }

    onLanguageChanged(e) {
        this.lang = e.detail.lang;
    }

    changed() {
        this.institute = this.select.options[this.select.selectedIndex].innerText;
        window.VPUPersonLibrary = this.institute;
        console.log('(change) window.VPUPersonLibrary = ' + window.VPUPersonLibrary);
    }
    //
    // selectOpen() {
    //     var e = document.createEvent('MouseEvents');
    //     e.initMouseEvent("click", true, true, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null);
    //     this.select.dispatchEvent(e);
    // }

    static get styles() {
        // language=css
        return css`
            ${commonStyles.getThemeCSS()}
            ${commonStyles.getGeneralCSS()}
            ${commonStyles.getNotificationCSS()}
            select, option {
              -webkit-appearance: none; /* WebKit/Chromium */
              -moz-appearance: none; /* Gecko */
              appearance: none; /* future (or now) */
              border: 0;
            }
            #select-1 {
                border-radius: var(--vpu-border-radius);
                color: inherit;
                background: inherit;
                margin-left: 20px;
            }
        `;
    }

    render() {
        return html`
        <select id="select-1" ?disabled=${this.institutes.length < 2} @change="${this.changed}">
        ${ this.institutes.map((item) => { return html`<option value=${item} ?selected=${item === this.institute}>${item}</option>`;})}
        </select>
        `;
//    <vpu-icon name="chevron-down" id="menu-chevron-icon" @click="${this.selectOpen}"></vpu-icon>
    }

    /**
     * Returns the list of assigned libraries of the current user
     *
     * @returns {Array}
     */
    getAssosiatedInstitutes() {
        if (window.VPUPerson === undefined) {
            return [];
        }

        const functions = window.VPUPerson.functions;

        if (functions === undefined) {
            return [];
        }

        const re = /^F_BIB:F:(\d+):\d+$/;
        let results = [];

        for (const item of functions) {
            const matches = re.exec(item);

            if (matches !== null) {
                results.push("F" + matches[1]);
            }
        }

        return results;
    };

}

commonUtils.defineCustomElement('vpu-select-institute', SelectInstitute);
