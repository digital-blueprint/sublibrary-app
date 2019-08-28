import * as utils from './utils.js';
import {i18n} from './i18n.js';
import {html, css} from 'lit-element';
import {send as notify} from 'vpu-notification';
import VPULitElement from 'vpu-common/vpu-lit-element';
import 'vpu-language-select';
import * as commonUtils from 'vpu-common/utils';
import bulmaCSSPath from 'bulma/css/bulma.min.css';
import Navigo from "navigo";
import buildinfo from 'consts:buildinfo';

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
                    'vpu-library-renew-loan*': () => that.switchComponent('vpu-library-renew-loan'),
                    '*': () => that.switchComponent('vpu-library-shelving')})
                .resolve();

            this.shadowRoot.querySelectorAll(".component").forEach((element) => {
                element.addEventListener("change", LibraryApp.updateSessionStorage);
            });
        });
    }

    static updateSessionStorage(event) {
        switch (event.detail.type) {
            case "person-id":
                sessionStorage.setItem('vpu-person-id', event.detail.value);
                break;
            case "book-offer-id":
                sessionStorage.setItem('vpu-book-offer-id', event.detail.value);
                break;
        }
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

    switchComponent(componentTag) {
        this.shadowRoot.querySelectorAll(".component").forEach((element) => {
            element.classList.add('hidden');
        });

        const component = this._(componentTag);

        if (component.hasAttribute("person-id")) {
            component.setAttribute("person-id", sessionStorage.getItem('vpu-person-id') || '');
        }

        if (component.hasAttribute("book-offer-id")) {
            component.setAttribute("book-offer-id", sessionStorage.getItem('vpu-book-offer-id') || '');
        }

        component.classList.remove('hidden');
    }

    onStyleLoaded () {
        this.shadowRoot.querySelector("#cover").style.opacity = "100";
        this.shadowRoot.querySelector("vpu-spinner").style.display = "none";
    }

    static get styles() {
        // language=css
        return css`
            /* Select2 doesn't work well with display: none */
            .hidden {left: -9999px; position: absolute;}
            #cover {opacity: 0}
        `;
    }

    render() {
        const bulmaCSS = utils.getAssetURL(bulmaCSSPath);

        return html`
            <link rel="stylesheet" href="${bulmaCSS}" @load="${this.onStyleLoaded}">

            <vpu-spinner></vpu-spinner>

            <div id="cover">
                <vpu-notification lang="${this.lang}"></vpu-notification>
                <header>
                    <div class="container">
                        <vpu-auth lang="${this.lang}" client-id="${commonUtils.setting('keyCloakClientId')}" load-person remember-login style="float:right"></vpu-auth>
                        <vpu-language-select @vpu-language-changed=${this.onLanguageChanged.bind(this)}></vpu-language-select>
                    </div>
                </header>

                <section class="section">
                    <div class="container">
                        <a href="#vpu-library-shelving" data-navigo>${i18n.t('menu.shelving')}</a> |
                        <a href="#vpu-library-create-loan" data-navigo>${i18n.t('menu.loan')}</a> |
                        <a href="#vpu-library-return-book" data-navigo>${i18n.t('menu.return')}</a> |
                        <a href="#vpu-library-renew-loan" data-navigo>${i18n.t('menu.renew')}</a>
                    </div>
                </section>

                <vpu-library-shelving entry-point-url="${this.entryPointUrl}" lang="${this.lang}" class="component hidden" book-offer-id=""></vpu-library-shelving>
                <vpu-library-create-loan entry-point-url="${this.entryPointUrl}" lang="${this.lang}" class="component hidden" person-id="" book-offer-id=""></vpu-library-create-loan>
                <vpu-library-return-book entry-point-url="${this.entryPointUrl}" lang="${this.lang}" class="component hidden" book-offer-id=""></vpu-library-return-book>
                <vpu-library-renew-loan entry-point-url="${this.entryPointUrl}" lang="${this.lang}" class="component hidden" person-id=""></vpu-library-renew-loan>

                <a href="${buildinfo.url}" style="float: right">
                    <div class="tags has-addons">
                        <span class="tag is-light">build</span>
                        <span class="tag is-dark">${buildinfo.info} (${buildinfo.env})</span>
                    </div>
                </a>
            </div>
        `;
    }
}

commonUtils.defineCustomElement('vpu-library-app', LibraryApp);
