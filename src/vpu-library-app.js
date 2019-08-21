import * as utils from './utils.js';
import {i18n} from './i18n.js';
import {html} from 'lit-element';
import {send as notify} from 'vpu-notification';
import VPULitElement from 'vpu-common/vpu-lit-element';
import 'vpu-language-select';
import * as commonUtils from 'vpu-common/utils';
import bulmaCSSPath from 'bulma/css/bulma.min.css';
import Navigo from "navigo";

class LibraryApp extends VPULitElement {
    constructor() {
        super();
        this.lang = 'de';
        this.entryPointUrl = commonUtils.getAPiUrl();
    }

    static get properties() {
        return {
            lang: { type: String },
            entryPointUrl: { type: String, attribute: 'entry-point-url' },
        };
    }

    connectedCallback() {
        super.connectedCallback();
        const that = this;

        this.updateComplete.then(()=>{
            new Navigo(null, true)
                .on({
                    'vpu-library-shelving*': () => that.switchComponent('vpu-library-shelving'),
                    'vpu-library-create-loan*': () => that.switchComponent('vpu-library-create-loan'),
                    'vpu-library-return-book*': () => that.switchComponent('vpu-library-return-book'),
                    '*': () => that.switchComponent('vpu-library-shelving')})
                .resolve();
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

    switchComponent(component) {
        this.shadowRoot.querySelectorAll(".component").forEach((element) => {
            element.classList.add('hidden');
        });

        this._(component).classList.remove('hidden');
    }

    render() {
        const bulmaCSS = utils.getAssetURL(bulmaCSSPath);

        return html`
            <link rel="stylesheet" href="${bulmaCSS}">
            <style>
                /* Select2 doesn't work well with display: none */
                .hidden {left: -9999px; position: absolute;}
            </style>

            <vpu-notification lang="${this.lang}"></vpu-notification>
            <header>
                <div class="container">
                    <vpu-auth lang="${this.lang}" client-id="${commonUtils.setting('keyCloakClientId')}" load-person force-login></vpu-auth>
                    <vpu-language-select @vpu-language-changed=${this.onLanguageChanged.bind(this)}></vpu-language-select>
                </div>
            </header>

            <section class="section">
                <div class="container">
                    <a href="#vpu-library-shelving" data-navigo>${i18n.t('menu.shelving')}</a> |
                    <a href="#vpu-library-create-loan" data-navigo>${i18n.t('menu.loan')}</a> |
                    <a href="#vpu-library-return-book" data-navigo>${i18n.t('menu.return')}</a>
                </div>
            </section>

            <vpu-library-shelving entry-point-url="${this.entryPointUrl}" lang="${this.lang}" class="component hidden"></vpu-library-shelving>
            <vpu-library-create-loan entry-point-url="${this.entryPointUrl}" lang="${this.lang}" class="component"></vpu-library-create-loan>
            <vpu-library-return-book entry-point-url="${this.entryPointUrl}" lang="${this.lang}" class="component hidden"></vpu-library-return-book>
        `;
    }
}

commonUtils.defineCustomElement('vpu-library-app', LibraryApp);
