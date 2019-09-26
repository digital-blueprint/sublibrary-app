import {i18n} from './i18n.js';
import {html, css} from 'lit-element';
import VPULitElement from 'vpu-common/vpu-lit-element';
import 'vpu-language-select';
import * as commonUtils from 'vpu-common/utils';
import bulmaCSSPath from 'bulma/css/bulma.min.css';
import buildinfo from 'consts:buildinfo';
import basePath from 'consts:basePath';
import {classMap} from 'lit-html/directives/class-map.js';
import * as errorreport from 'vpu-common/errorreport';
import {Router} from './router.js';

errorreport.init({release: 'vpi-library-app@' + buildinfo.info});

class LibraryApp extends VPULitElement {
    constructor() {
        super();
        this.lang = 'de';
        this.defaultView = 'vpu-library-shelving';
        this.activeView = this.defaultView;
        this.entryPointUrl = commonUtils.getAPiUrl();
        this.user = '';

        this.initRouter();

        // listen to the vpu-auth-profile event to switch to the person profile
        window.addEventListener("vpu-auth-profile", () => {
            this.switchComponent('vpu-person-profile');
        });
    }

    initRouter() {
        const routes = [
            {
                path: '',
                action: (context) => {
                    return {
                        lang: this.lang,
                        component: this.defaultView,
                    };
                }
            },
            {
                path: '/:lang',
                children: [
                    {
                        path: '',
                        action: (context, params) => {
                            return {
                                lang: params.lang,
                                component: this.defaultView,
                            };
                        }
                    },
                    {
                        name: 'mainRoute',
                        path: '/:component',
                        action: (context, params) => {
                            // remove the additional parameters added by Keycloak
                            let componentTag = params.component.toLowerCase().replace(/&.+/,"");
                            return {
                                lang: params.lang,
                                component: componentTag,
                            };
                        },
                    },
                ],
            },
        ];

        this.router = new Router(routes, {
            routeName: 'mainRoute',
            getState: () => {
                return {
                    component: this.activeView,
                    lang: this.lang,
                };
            },
            setState: (state) => {
                this.updateLangIfChanged(state.lang);
                this.switchComponent(state.component);
            }
        },{
            baseUrl: basePath.replace(/\/$/, ""),
        });

        this.router.setStateFromCurrentLocation();
    }

    static get properties() {
        return {
            lang: { type: String },
            activeView: { type: String, attribute: false},
            entryPointUrl: { type: String, attribute: 'entry-point-url' },
            user: { type: String, attribute: false },
        };
    }

    connectedCallback() {
        super.connectedCallback();
        const that = this;

        this.updateComplete.then(()=>{
            this.shadowRoot.querySelectorAll(".component").forEach((element) => {
                element.addEventListener("change", LibraryApp.updateSessionStorage);
            });

            // jump to the other pages without reloading the browser window
            this.shadowRoot.querySelectorAll("a[data-nav]").forEach((link) => {
                link.addEventListener("click", (e) => {
                    e.preventDefault();
                    const location = link.getAttribute('href');
                    this.router.updateFromPathname(location);
                });
            });

            window.addEventListener("vpu-auth-person-init", () => {
                that.user = that._('vpu-auth').person.identifier;
            });
        });
    }

    /**
     * Switches language if another language is requested
     *
     * @param {string} lang
     */
    updateLangIfChanged(lang) {
        if (this.lang !== lang) {
            this.lang = lang;
            this.router.update();

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
        const newLang = e.detail.lang;
        const changed = (this.lang !== newLang);
        this.lang = newLang;
        if (changed)
            this.router.update();
    }

    switchComponent(componentTag) {
        const changed = (componentTag !== this.activeView);
        this.activeView = componentTag;
        const component = this._(componentTag);
        this.updatePageTitle();
        if (changed)
            this.router.update();

        if (!component)
            return;

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
            .hidden {display: none}
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
        const date = new Date(buildinfo.time);
        commonUtils.initAssetBaseURL('vpu-library-app-src');
        const bulmaCSS = commonUtils.getAssetURL(bulmaCSSPath);

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
                    
                        <a href="${this.router.getPathname({component: 'vpu-library-shelving'})}" data-nav class="${getSelectClasses('vpu-library-shelving')}">${i18n.t('menu.shelving')}</a> |
                        <a href="${this.router.getPathname({component: 'vpu-library-create-loan'})}" data-nav class="${getSelectClasses('vpu-library-create-loan')}">${i18n.t('menu.loan')}</a> |
                        <a href="${this.router.getPathname({component: 'vpu-library-return-book'})}" data-nav class="${getSelectClasses('vpu-library-return-book')}">${i18n.t('menu.return')}</a> |
                        <a href="${this.router.getPathname({component: 'vpu-library-renew-loan'})}" data-nav class="${getSelectClasses('vpu-library-renew-loan')}">${i18n.t('menu.renew')}</a>
                    </div>
                </section>

                <vpu-library-shelving entry-point-url="${this.entryPointUrl}" lang="${this.lang}" class="component ${getViewClasses('vpu-library-shelving')}" book-offer-id=""></vpu-library-shelving>
                <vpu-library-create-loan entry-point-url="${this.entryPointUrl}" lang="${this.lang}" class="component ${getViewClasses('vpu-library-create-loan')}" person-id="" book-offer-id=""></vpu-library-create-loan>
                <vpu-library-return-book entry-point-url="${this.entryPointUrl}" lang="${this.lang}" class="component ${getViewClasses('vpu-library-return-book')}" book-offer-id=""></vpu-library-return-book>
                <vpu-library-renew-loan entry-point-url="${this.entryPointUrl}" lang="${this.lang}" class="component ${getViewClasses('vpu-library-renew-loan')}" person-id=""></vpu-library-renew-loan>
                <vpu-person-profile entry-point-url="${this.entryPointUrl}" lang="${this.lang}" class="component ${getViewClasses('vpu-person-profile')}" value="${this.user}"></vpu-person-profile>

                <a href="${buildinfo.url}" style="float: right">
                    <div class="tags has-addons" title="Build Time: ${date.toString()}">
                        <span class="tag is-light">build</span>
                        <span class="tag is-dark">${buildinfo.info} (${buildinfo.env})</span>
                    </div>
                </a>
            </div>
        `;
    }
}

commonUtils.defineCustomElement('vpu-library-app', LibraryApp);
