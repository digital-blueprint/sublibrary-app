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
import UniversalRouter from 'universal-router';
import generateUrls from 'universal-router/generateUrls'

errorreport.init({release: 'vpi-library-app@' + buildinfo.info})

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
                    }
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
                            }
                        }
                    },
                    {
                        name: 'component',
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

        // https://github.com/kriasoft/universal-router
        this.router = new UniversalRouter(routes, {
            baseUrl: basePath.replace(/\/$/, ""),
        });

        this.setStateFromCurrentLocation();

        window.addEventListener('popstate', (event) => {
            this.setStateFromCurrentLocation();
        });
    }

    /**
     * Update the router after some internal state change.
     */
    updateRouter() {
        // Queue updates so we can call this multiple times when changing state
        // without it resulting in multiple location changes
        setTimeout(() => {
            const newPathname = this.getRoutePathname();
            const oldPathname = location.pathname;
            if (newPathname === oldPathname)
                return;
            window.history.pushState({}, '', newPathname);
        });
    }

    /**
     * In case something else has changed the location, update the app state accordingly.
     */
    setStateFromCurrentLocation() {
        const oldPathName = location.pathname;
        this.router.resolve({pathname: oldPathName}).then(page => {
            const newPathname = this.getRoutePathname(page);
            // In case of a router redirect, set the new location
            if (newPathname != oldPathName) {
                window.history.replaceState({}, '', newPathname);
            }
            this.updateState(page);
        });
    }

    /**
     * Given a new routing path set the location and the app state.
     *
     * @param {string} pathname
     */
    updateRouterFromPathname(pathname) {
        this.router.resolve({pathname: pathname}).then(page => {
            let newPathname = this.getRoutePathname(page);
            if (location.pathname === newPathname)
                return;
            window.history.pushState({}, '', newPathname);
            this.updateState(page);
        });
    }

    /**
     * Pass some new router state to get a new router path that can
     * be passed to updateRouterFromPathname() later on. If nothing is
     * passed the current state is used.
     *
     * @param {object} [page]
     */
    getRoutePathname(page) {
        if (!page)
            page = {}
        if (!page.lang)
            page.lang = this.lang;
        if (!page.component)
            page.component = this.activeView;
        return generateUrls(this.router)('component', page);
    }

    updateState(page) {
        this.updateLangIfChanged(page.lang);
        this.switchComponent(page.component);
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
                    this.updateRouterFromPathname(location);
                });
            });

            window.addEventListener("vpu-auth-person-init", () => {
                that.user = that._('vpu-auth').person.identifier;
            });
        });
    }

    /**
     * Switches language if another language is requested
     */
    updateLangIfChanged(lang) {
        if (this.lang !== lang) {
            this.lang = lang;
            this.updateRouter();

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
        const newLang = e.detail.lang
        const changed = (this.lang !== newLang);
        this.lang = newLang;
        if (changed)
            this.updateRouter();
    }

    switchComponent(componentTag) {
        const changed = (componentTag !== this.activeView);
        this.activeView = componentTag;
        const component = this._(componentTag);
        this.updatePageTitle();
        if (changed)
            this.updateRouter();

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
                    
                        <a href="${this.getRoutePathname({component: 'vpu-library-shelving'})}" data-nav class="${getSelectClasses('vpu-library-shelving')}">${i18n.t('menu.shelving')}</a> |
                        <a href="${this.getRoutePathname({component: 'vpu-library-create-loan'})}" data-nav class="${getSelectClasses('vpu-library-create-loan')}">${i18n.t('menu.loan')}</a> |
                        <a href="${this.getRoutePathname({component: 'vpu-library-return-book'})}" data-nav class="${getSelectClasses('vpu-library-return-book')}">${i18n.t('menu.return')}</a> |
                        <a href="${this.getRoutePathname({component: 'vpu-library-renew-loan'})}" data-nav class="${getSelectClasses('vpu-library-renew-loan')}">${i18n.t('menu.renew')}</a>
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
                <input type="button" class="button is-small" @click="${() => {
                    try {
                        throw new Error('I\'m an error');
                    } catch (e) {
                        errorreport.captureException(e);
                    }
                }}" value="test error">
            </div>
        `;
    }
}

commonUtils.defineCustomElement('vpu-library-app', LibraryApp);
