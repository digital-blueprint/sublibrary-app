import * as utils from './utils.js';
import {i18n} from './i18n.js';
import {html} from 'lit-element';
import {send as notify} from 'vpu-notification';
import VPULitElement from 'vpu-common/vpu-lit-element';
import 'vpu-language-select';
import commonUtils from 'vpu-common/utils';

class LibraryApp extends VPULitElement {
    constructor() {
        super();
        this.lang = 'de';
        this.entryPointUrl = utils.getAPiUrl();
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
        const bulmaCSS = utils.getAssetURL('bulma/bulma.min.css');

        return html`
            <link rel="stylesheet" href="${bulmaCSS}">
            <style>
                /* Select2 doesn't work well with display: none */
                .hidden {left: -9999px; position: absolute;}
            </style>

            <vpu-notification lang="${this.lang}"></vpu-notification>
            <header>
                <div class="container">
                    <vpu-auth lang="${this.lang}" client-id="${utils.setting('keyCloakClientId')}" load-person force-login></vpu-auth>
                    <vpu-language-select @vpu-language-changed=${this.onLanguageChanged.bind(this)}></vpu-language-select>
                </div>
            </header>

            <section class="section">
                <div class="container">
                    <a href="#" @click="${() => this.switchComponent('vpu-library-shelving')}">${i18n.t('menu.shelving')}</a> |
                    <a href="#" @click="${() => this.switchComponent('vpu-library-create-loan')}">${i18n.t('menu.loan')}</a> |
                    <a href="#" @click="${() => this.switchComponent('vpu-library-return-book')}">${i18n.t('menu.return')}</a>
                </div>
            </section>

            <vpu-library-shelving entry-point-url="${this.entryPointUrl}" lang="${this.lang}" class="component hidden"></vpu-library-shelving>
            <vpu-library-create-loan entry-point-url="${this.entryPointUrl}" lang="${this.lang}" class="component"></vpu-library-create-loan>
            <vpu-library-return-book entry-point-url="${this.entryPointUrl}" lang="${this.lang}" class="component hidden"></vpu-library-return-book>
        `;
    }
}

commonUtils.defineCustomElement('vpu-library-app', LibraryApp);
