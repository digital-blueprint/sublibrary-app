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
import {classMap} from 'lit-html/directives/class-map.js';

class LibraryApp extends VPULitElement {
    constructor() {
        super();
        this.lang = 'de';
        this.activeView = 'vpu-library-shelving';
        this.entryPointUrl = commonUtils.getAPiUrl();
    }

    static get properties() {
        return {
            lang: { type: String },
            activeView: { type: String, attribute: false},
            entryPointUrl: { type: String, attribute: 'entry-point-url' },
        };
    }

    connectedCallback() {
        super.connectedCallback();
        const that = this;

        this.updateComplete.then(()=>{
            // see: https://github.com/krasimir/navigo
            new Navigo(null, true)
                .on({
                    ':lang/:component*': (params) => {
                        // fallback to "de" if language is not valid
                        const lang = ["en", "de"].includes(params.lang.toLowerCase()) ? params.lang : "de";

                        // switch language if another language is requested
                        that.updateLangIfChanged(lang);

                        // remove the additional parameters added by Keycloak
                        let componentTag = params.component.toLowerCase().replace(/&.+/,"");

                        // fallback to shelving if not found
                        // TODO: do we want a "not found" page?
                        if (that._(componentTag) === null) {
                            componentTag = "vpu-library-shelving";
                        }

                        // switch to the component
                        that.switchComponent(componentTag);
                    },
                    '*': () => that.switchComponent('vpu-library-shelving')})
                .resolve();

            this.shadowRoot.querySelectorAll(".component").forEach((element) => {
                element.addEventListener("change", LibraryApp.updateSessionStorage);
            });
        });
    }

    /**
     * Switches language if another language is requested
     */
    updateLangIfChanged(lang) {
        if (this.lang !== lang) {
            this.lang = lang;

            const event = new CustomEvent("vpu-language-changed", {
                bubbles: true,
                detail: {'lang': lang}
            });

            this.dispatchEvent(event);
        }
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

        // update url in browser window if language was changed
        const url = location.href.replace(/^http.+#(\w{2})(\/.+)$/ig, `#${this.lang}$2`);
        window.history.pushState({},"", url);
    }

    switchComponent(componentTag) {
        this.activeView = componentTag;
        const component = this._(componentTag);
        this.updatePageTitle();

        if (component.hasAttribute("person-id")) {
            component.setAttribute("person-id", sessionStorage.getItem('vpu-person-id') || '');
        }

        if (component.hasAttribute("book-offer-id")) {
            component.setAttribute("book-offer-id", sessionStorage.getItem('vpu-book-offer-id') || '');
        }
    }

    updatePageTitle() {
        document.title = `${i18n.t('page-title')} - ${i18n.t(this.activeView + '.page-title')}`;
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

            .menu a {
                padding: 0.3em;
                font-weight: 600;
                color: #000;
            }
            .menu a:hover {
                color: #E4154B;
            }
            .selected {border-bottom: 1px solid #000; color: #000}
        `;
    }

    render() {
        const bulmaCSS = utils.getAssetURL(bulmaCSSPath);

        const getViewClasses = (name => {
            return classMap({hidden: this.activeView !== name});
        });

        const getSelectClasses = (name => {
            return classMap({selected: this.activeView === name});
        });

        this.updatePageTitle();

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
                    <div class="container menu">
                        <a href="#${this.lang}/vpu-library-shelving" data-navigo class="${getSelectClasses('vpu-library-shelving')}">${i18n.t('menu.shelving')}</a> |
                        <a href="#${this.lang}/vpu-library-create-loan" data-navigo class="${getSelectClasses('vpu-library-create-loan')}">${i18n.t('menu.loan')}</a> |
                        <a href="#${this.lang}/vpu-library-return-book" data-navigo class="${getSelectClasses('vpu-library-return-book')}">${i18n.t('menu.return')}</a> |
                        <a href="#${this.lang}/vpu-library-renew-loan" data-navigo class="${getSelectClasses('vpu-library-renew-loan')}">${i18n.t('menu.renew')}</a>
                    </div>
                </section>

                <vpu-library-shelving entry-point-url="${this.entryPointUrl}" lang="${this.lang}" class="component ${getViewClasses('vpu-library-shelving')}" book-offer-id=""></vpu-library-shelving>
                <vpu-library-create-loan entry-point-url="${this.entryPointUrl}" lang="${this.lang}" class="component ${getViewClasses('vpu-library-create-loan')}" person-id="" book-offer-id=""></vpu-library-create-loan>
                <vpu-library-return-book entry-point-url="${this.entryPointUrl}" lang="${this.lang}" class="component ${getViewClasses('vpu-library-return-book')}" book-offer-id=""></vpu-library-return-book>
                <vpu-library-renew-loan entry-point-url="${this.entryPointUrl}" lang="${this.lang}" class="component ${getViewClasses('vpu-library-renew-loan')}" person-id=""></vpu-library-renew-loan>

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
