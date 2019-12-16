import {i18n} from './i18n.js';
import {css, html} from 'lit-element';
import VPULibraryLitElement from "./vpu-library-lit-element";
import * as commonUtils from 'vpu-common/utils';
import * as commonStyles from 'vpu-common/styles';
import 'vpu-person-profile';


class LibraryProfile extends VPULibraryLitElement {

    constructor() {
        super();
        this.lang = 'de';
        this._personId = window.VPUPersonId;
        this.entryPointUrl = commonUtils.getAPiUrl();

    }

    static get properties() {
        return {
            lang: { type: String },
            entryPointUrl: { type: String, attribute: 'entry-point-url' },
            _personId: {type: String, attribute: false},
        };
    }

    connectedCallback() {
        super.connectedCallback();

        window.addEventListener("vpu-auth-person-init", () => {
            this._personId = window.VPUPersonId;
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

    static get styles() {
        // language=css
        return css`
            ${commonStyles.getThemeCSS()}
            ${commonStyles.getGeneralCSS()}
        `;
    }

    render() {
        return html`
            <vpu-person-profile value="${this._personId}" entry-point-url="${this.entryPointUrl}"" .lang="${this.lang}"></vpu-person-profile>
        `;
    }
}

commonUtils.defineCustomElement('vpu-library-profile', LibraryProfile);