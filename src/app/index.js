import {i18n} from './i18n.js';
import {html, css} from 'lit-element';
import VPULitElement from 'vpu-common/vpu-lit-element';
import 'vpu-language-select';
import 'vpu-common/vpu-button.js';
import 'vpu-auth';
import 'vpu-notification';
import * as commonUtils from 'vpu-common/utils';
import * as commonStyles from 'vpu-common/styles';
import buildinfo from 'consts:buildinfo';
import {classMap} from 'lit-html/directives/class-map.js';
// import * as errorreport from 'vpu-common/errorreport';
import {Router} from './router.js';
import * as events from 'vpu-common/events.js';
import './build-info.js';
import {send as notify} from 'vpu-notification';

// errorreport.init({release: 'vpi-library-app@' + buildinfo.info});


/**
 * In case the application gets updated future dynamic imports might fail.
 * This sends a notification suggesting the user to reload the page.
 *
 * uage: importNotify(import('<path>'));
 *
 * @param {Promise} promise
 */
const importNotify = async (promise) => {
    try {
        return await promise;
    } catch (error) {
        console.log(error);
        notify({
            "body": i18n.t('page-updated-needs-reload'),
            "type": "info",
            "icon": "warning"
        });
        throw error;
    }
};


class VPUApp extends VPULitElement {
    constructor() {
        super();
        this.lang = 'de';
        this.activeView = '';
        this.entryPointUrl = commonUtils.getAPiUrl();
        this.subtitle = '';
        this.description = '';
        this.routes = [];
        this.metadata = {};
        this.topic = {};
        this.basePath = '';

        this._updateAuth = this._updateAuth.bind(this);
        this._loginStatus = 'unknown';
        this._subscriber = new events.EventSubscriber('vpu-auth-update', 'vpu-auth-update-request');

        this._attrObserver = new MutationObserver(this.onAttributeObserved);
    }

    onAttributeObserved(mutationsList, observer) {
        for(let mutation of mutationsList) {
            if (mutation.type === 'attributes') {
                const key = mutation.attributeName;
                const value = mutation.target.getAttribute(key);
                sessionStorage.setItem('vpu-attr-' + key, value);
            }
        }
    }

    /**
     * Fetches the metadata of the components we want to use in the menu, dynamically imports the js modules for them,
     * then triggers a rebuilding of the menu and resolves the current route
     *
     * @param {string} topicURL The topic metadata URL or relative path to load things from
     */
    async fetchMetadata(topicURL) {
        const metadata = {};
        const routes = [];

        const result = await (await fetch(topicURL, {
            headers: {'Content-Type': 'application/json'}
        })).json();

        this.topic = result;

        const fetchOne = async (url) => {
              const result = await fetch(url, {
                headers: {'Content-Type': 'application/json'}
            });
            if (!result.ok)
                throw result;

            const jsondata = await result.json();
            if (jsondata["element"] === undefined)
                throw new Error("no element defined in metadata");

            return jsondata;
        };

        let promises = [];
        for (const activity of result.activities) {
            const actURL = new URL(activity.path, new URL(topicURL, window.location).href).href;
            promises.push([activity.visible === undefined || activity.visible, actURL, fetchOne(actURL)]);
        }

        for (const [visible, actURL, p] of promises) {
            try {
                const activity = await p;
                activity.visible = visible;
                // Resolve module_src relative to the location of the json file
                activity.module_src = new URL(activity.module_src, actURL).href;
                metadata[activity.routing_name] = activity;
                routes.push(activity.routing_name);
            } catch (error) {
                console.log(error);
            }
        }
        // this also triggers a rebuilding of the menu
        this.metadata = metadata;
        this.routes = routes;

        // Switch to the first route if none is selected
        if (!this.activeView)
            this.switchComponent(routes[0]);
        else
            this.switchComponent(this.activeView);

    }

    initRouter() {
        const routes = [
            {
                path: '',
                action: (context) => {
                    return {
                        lang: this.lang,
                        component: '',
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
                                component: '',
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
        }, {
            baseUrl: new URL(this.basePath, window.location).pathname.replace(/\/$/, ''),
        });

        this.router.setStateFromCurrentLocation();
    }

    static get properties() {
        return {
            lang: { type: String },
            src: { type: String },
            basePath: { type: String, attribute: 'base-path' },
            activeView: { type: String, attribute: false},
            entryPointUrl: { type: String, attribute: 'entry-point-url' },
            metadata: { type: Object, attribute: false },
            topic: { type: Object, attribute: false },
            subtitle: { type: String, attribute: false },
            description: { type: String, attribute: false },
            _loginStatus: { type: Boolean, attribute: false },
        };
    }

    _updateAuth(login) {
        this._loginStatus = login.status;

        // Clear the session storage when the user logs out
        if (this._loginStatus === 'logging-out') {
            sessionStorage.clear();
        }
    }

    connectedCallback() {
        super.connectedCallback();

        if (this.src)
            this.fetchMetadata(this.src);
        this.initRouter();

        // listen to the vpu-auth-profile event to switch to the person profile
        window.addEventListener("vpu-auth-profile", () => {
            this.switchComponent('person-profile');
        });

        this._subscriber.subscribe(this._updateAuth);
    }

    disconnectedCallback() {
        this._subscriber.unsubscribe(this._updateAuth);
        super.disconnectedCallback();
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

    update(changedProperties) {
        changedProperties.forEach((oldValue, propName) => {
            if (propName === "lang") {
                i18n.changeLanguage(this.lang);
            }
        });

        super.update(changedProperties);
    }

    onMenuItemClick(e) {
        e.preventDefault();
        const link = e.composedPath()[0];
        const location = link.getAttribute('href');
        this.router.updateFromPathname(location);
    }

    onLanguageChanged(e) {
        const newLang = e.detail.lang;
        const changed = (this.lang !== newLang);
        this.lang = newLang;
        if (changed) {
            this.router.update();
            this.subtitle = this.activeMetaDataText("short_name");
            this.description = this.activeMetaDataText("description");
        }
    }

    switchComponent(componentTag) {
        const changed = (componentTag !== this.activeView);
        this.activeView = componentTag;
        if (changed)
            this.router.update();
        const metadata = this.metadata[componentTag];

        if (metadata === undefined) {
            return;
        }

        importNotify(import(metadata.module_src)).then(() => {
            this.updatePageTitle();
            this.subtitle = this.activeMetaDataText("short_name");
            this.description = this.activeMetaDataText("description");
        }).catch((e) => {
            console.error(`Error loading ${ metadata.element }`);
            throw e;
        });
    }

    metaDataText(routingName, key) {
        const metadata = this.metadata[routingName];
        return metadata !== undefined && metadata[key] !== undefined ? metadata[key][this.lang] : '';
    }

    topicMetaDataText(key) {
        return (this.topic[key] !== undefined) ? this.topic[key][this.lang] : '';
    }

    activeMetaDataText(key) {
        return this.metaDataText(this.activeView, key);
    }

    updatePageTitle() {
        document.title = `${i18n.t('page-title')} - ${this.activeMetaDataText("short_name")}`;
    }

    toggleMenu() {
        const menu = this._("ul.menu");

        if (menu === null) {
            return;
        }

        menu.classList.toggle('hidden');

        const chevron = this._("#menu-chevron-icon");
        if (chevron !== null) {
            chevron.name = menu.classList.contains('hidden') ? 'chevron-down' : 'chevron-up';
        }
    }

    static get styles() {
        // language=css
        return css`
            ${commonStyles.getThemeCSS()}
            ${commonStyles.getGeneralCSS()}

            /* TU-Graz style override */
            :host {
                --vpu-override-info-bg-color: #245b78;
                --vpu-override-danger-bg-color: #e4154b;
                --vpu-override-warning-bg-color: #f4a300;
                --vpu-override-warning-text-color: #fff;
                --vpu-override-success-bg-color: #259207;
            }

            .hidden {display: none}

            h1.title {margin-bottom: 0}

            #main {
                display: grid;
                grid-template-columns: 180px auto;
                grid-template-rows: 120px auto auto 40px;
                grid-template-areas: "header header" "headline headline" "sidebar main" "footer footer";
            }

            header {
                grid-area: header;
                display: grid;
                grid-template-columns: 50% auto;
                grid-template-rows: 60px 60px;
                grid-template-areas: "hd1-left hd1-right" "hd2-left hd2-right";
                width: 100%;
                max-width: 1060px;
                margin: 0 auto;
            }

            aside { grid-area: sidebar; margin: 30px 15px; }
            #headline { grid-area: headline; margin: 15px; text-align: center; }
            main { grid-area: main; margin: 30px 15px; }
            footer { grid-area: footer; margin: 30px; }

            header .hd1-left {
                display: flex;
                flex-direction: column;
                justify-content: center;
                grid-area: hd1-left;
                text-align: right;
                border-right: black solid 1px;
                padding-right: 20px;
            }

            header .hd1-right {
                grid-area: hd1-right;
                display: flex;
                flex-direction: column;
                justify-content: center;
                padding-left: 20px;
            }

            header .hd2-left {
                grid-area: hd2-left;
                display: flex;
                flex-direction: column;
                white-space: nowrap;
            }

            header .hd2-left .header {
                margin-left: 50px;
            }

            header .hd2-left a:hover {
                color: #fff;
                background-color: #000;
            }

            header .hd2-right {
                grid-area: hd2-right;
                display: flex;
                flex-direction: column;
                justify-content: center;
                text-align: right;
            }

            #int-header-logo {
                white-space: nowrap;
                padding: 0 50px 0 0;
            }

            #int-header-logo-claim
            {
                font-size: 12px;
                text-align: right;
                padding: 0 17px 0 0;
                line-height: 17px;
                letter-spacing: 2px;
                vertical-align: top;
                text-transform: uppercase;
                display: inline-block;
            }

            #int-header-logo-img {
                overflow: visible;
            }

            #int-header-logo a:hover path, #int-header-logo a:focus path {
                fill:#000 !important;
                transition:none;
            }

            #int-header-logo * {
                transition:fill 0.15s, stroke 0.15s;
            }

            header a {
                color: black;
                display: inline;
            }

            aside ul.menu {
                list-style: none;
            }

            ul.menu li.close {
                display: none;
            }

            .menu a {
                padding: 0.3em;
                font-weight: 400;
                color: #000;
                display: block;
            }

            .menu a:hover {
                color: #E4154B;
            }

            .menu a.selected { color: white; background-color: black; }

            aside .subtitle {
                display: none;
                color: #4a4a4a;
                font-size: 1.25rem;
                font-weight: 400;
                line-height: 1.25;
                cursor: pointer;
                text-align: center;
            }

            ul.menu.hidden {
                display: block;
            }

            a { transition: background-color 0.15s ease 0s, color 0.15s ease 0s; }

            .description {
                font-family: 'Source Sans Pro';
                text-align: left;
                margin-bottom: 1rem;
            }

            @media (max-width: 680px) {
                #main {
                    grid-template-columns: auto;
                    grid-template-rows: 40px auto auto auto 40px;
                    grid-template-areas: "header" "headline" "sidebar" "main" "footer";
                }

                header {
                    grid-template-rows: 40px;
                    grid-template-areas: "hd1-left hd1-right";
                }

                header .hd2-left, header .hd2-right {
                    display: none;
                }

                aside {
                    margin: 0 15px;
                }

                aside h2.subtitle {
                    display: block;
                    margin-bottom: 0.5em;
                }

                aside h2.subtitle:not(:last-child) {
                    margin-bottom: 0.5em;
                }

                aside .menu {
                    border: black 1px solid;
                }

                .menu li {
                    padding: 7px;
                }

                .menu a {
                    padding: 8px;
                }

                ul.menu li.close {
                    display: block;
                    padding: 0 15px 15px 15px;
                    text-align: right;
                    cursor: pointer;
                }

                ul.menu.hidden {
                    display: none;
                }
            }
        `;
    }

    _createActivityElement(activity) {
        // We have to create elements dynamically based on a tag name which isn't possible with lit-html.
        // This means we pass the finished element to lit-html and have to handle element caching and
        // event binding ourselves.

        if (this._lastElm !== undefined) {
            if (this._lastElm.tagName.toLowerCase() == activity.element.toLowerCase()) {
                return this._lastElm;
            } else {
                this._attrObserver.disconnect();
                this._lastElm = undefined;
            }
        }

        const elm = document.createElement(activity.element);

        for(const key of this.topic.attributes) {
            let value = sessionStorage.getItem('vpu-attr-' + key);
            if (value !== null) {
                elm.setAttribute(key, value);
            }
        }

        this._attrObserver.observe(elm, {attributes: true, attributeFilter: this.topic.attributes});

        this._lastElm = elm;
        return elm;
    }

    _renderActivity() {
        const act = this.metadata[this.activeView];
        if (act === undefined)
            return html``;

        const elm =  this._createActivityElement(act);
        elm.setAttribute("entry-point-url", this.entryPointUrl);
        elm.setAttribute("lang", this.lang);
        return elm;
    }

    render() {
        const silentCheckSsoUri = commonUtils.getAssetURL('silent-check-sso.html');

        const getSelectClasses = (name => {
            return classMap({selected: this.activeView === name});
        });

        // We hide the app until we are either fully logged in or logged out
        // At the same time when we hide the main app we show the main slot (e.g. a loading spinner)
        const hidden = (this._loginStatus == 'unknown' || this._loginStatus == 'logging-in');
        const mainClassMap = classMap({hidden: hidden});
        const slotClassMap = classMap({hidden: !hidden});

        const prodClassMap = classMap({hidden: buildinfo.env === 'production'});

        this.updatePageTitle();

        // build the menu
        let menuTemplates = [];
        for (let routingName of this.routes) {
            const data = this.metadata[routingName];

            if (data['visible']) {
                menuTemplates.push(html`<li><a @click="${(e) => this.onMenuItemClick(e)}" href="${this.router.getPathname({component: routingName})}" data-nav class="${getSelectClasses(routingName)}" title="${this.metaDataText(routingName, "description")}">${this.metaDataText(routingName, "short_name")}</a></li>`);
            }
        }

        return html`
            <slot class="${slotClassMap}"></slot>
            <div class="${mainClassMap}">
            <div id="main">
                <vpu-notification lang="${this.lang}"></vpu-notification>
                <header>
                    <div class="hd1-left">
                        <vpu-language-select @vpu-language-changed=${this.onLanguageChanged.bind(this)}></vpu-language-select>
                    </div>
                    <div class="hd1-right">
                        <vpu-auth lang="${this.lang}" show-profile client-id="${commonUtils.setting('keyCloakClientId')}" silent-check-sso-uri="${silentCheckSsoUri}" load-person try-login></vpu-auth>
                    </div>
                    <div class="hd2-left">
                        <div class="header">
                            <a href="https://www.tugraz.at/" title="TU Graz Home" target="_blank">TU Graz<br>Graz University of Technology</a>
                        </div>
                    </div>
                    <div class="hd2-right">
                        <div id="int-header-logo">
                            <a href="https://www.tugraz.at" title="TU Graz Home" target="_blank">
                                <div id="int-header-logo-claim">
                                    <div class="int-header-logo-claim-single">${i18n.t('logo.word1')}</div>
                                    <div class="int-header-logo-claim-single">${i18n.t('logo.word2')}</div>
                                    <div class="int-header-logo-claim-single">${i18n.t('logo.word3')}</div>
                                </div>
                                <svg id="int-header-logo-img" xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns="http://www.w3.org/2000/svg" xml:space="preserve" height="51.862" width="141.1" version="1.1" xmlns:cc="http://creativecommons.org/ns#" xmlns:dc="http://purl.org/dc/elements/1.1/" viewBox="0 0 141.10001 51.862499"><g transform="matrix(1.25 0 0 -1.25 0 51.862)"><g transform="scale(.1)"><path style="fill:#e4154b" d="m0 103.73h207.45v207.46l-207.45 0.01v-207.47z"></path><path style="fill:#e4154b" d="m228.19 103.73h207.46v207.46h-207.46v-207.46z"></path><path style="fill:#e4154b" d="m456.41 103.73h207.44v207.46h-207.44v-207.46z"></path><path style="fill:#e4154b" d="m103.72 0h207.47v207.46h-207.47v-207.46z"></path><path style="fill:#e4154b" d="m352.68 207.46h207.44v207.46h-207.44v-207.46z"></path><path style="fill:#231f20" d="m751.04 277.91h-66.426v33.195h171.19v-33.195h-66.407v-173.73h-38.359v173.73"></path><path style="fill:#231f20" d="m1048.3 180.22c0-12.461-2.25-23.711-6.72-33.75-4.5-10.039-10.61-18.555-18.36-25.567-7.76-7.031-16.9-12.421-27.503-16.21-10.605-3.809-22.109-5.7036-34.551-5.7036-12.422 0-23.945 1.8946-34.551 5.7036-10.605 3.789-19.824 9.179-27.656 16.21-7.851 7.012-13.984 15.528-18.34 25.567-4.394 10.039-6.582 21.289-6.582 33.75v130.89h38.379v-129.59c0-5.039 0.801-10.351 2.442-15.898 1.64-5.547 4.336-10.664 8.125-15.332s8.789-8.516 15.039-11.523c6.211-3.008 13.926-4.512 23.144-4.512 9.199 0 16.914 1.504 23.145 4.512 6.23 3.007 11.25 6.855 15.039 11.523 3.77 4.668 6.48 9.785 8.12 15.332 1.63 5.547 2.45 10.859 2.45 15.898v129.59h38.38v-130.89"></path><path style="fill:#231f20" d="m832.56 75.664c-7.597 3.2812-17.46 4.8632-25.332 4.8632-22.929 0-35.605-14.434-35.605-33.184 0-18.613 12.383-32.637 33.34-32.637 5.351 0 9.59 0.5274 12.969 1.3086v23.867h-20.84v14.414h39.687v-49.297c-10.41-2.6172-21.25-4.707-31.816-4.707-31.797 0-53.906 14.805-53.906 45.742 0 31.348 20.566 48.906 53.906 48.906 11.406 0 20.41-1.4453 28.867-3.8086l-1.27-15.469"></path><path style="fill:#231f20" d="m856.2 69.375h16.758v-15.332h0.293c0.84 6.289 8.574 16.914 19.824 16.914 1.836 0 3.828 0 5.782-0.5273v-17.715c-1.68 0.918-5.059 1.4454-8.457 1.4454-15.333 0-15.333-17.832-15.333-27.52v-24.785h-18.867v67.52"></path><path style="fill:#231f20" d="m913.75 65.84c7.324 3.1446 17.187 5.1172 25.215 5.1172 22.09 0 31.23-8.5351 31.23-28.457v-8.6523c0-6.8165 0.156-11.934 0.293-16.914 0.137-5.1172 0.41-9.8242 0.84-15.078h-16.602c-0.703 3.5352-0.703 8.0078-0.839 10.098h-0.293c-4.36-7.4618-13.81-11.661-22.38-11.661-12.793 0-25.332 7.207-25.332 20.059 0 10.078 5.195 15.976 12.383 19.258 7.187 3.2812 16.464 3.9453 24.355 3.9453h10.41c0 10.879-5.195 14.551-16.328 14.551-8.008 0-16.035-2.8907-22.363-7.3438l-0.586 15.078zm22.11-52.715c5.782 0 10.274 2.3633 13.223 6.0352 3.105 3.8086 3.945 8.6523 3.945 13.906h-8.164c-8.437 0-20.957-1.3086-20.957-11.68 0-5.7617 5.195-8.2617 11.953-8.2617"></path><path style="fill:#231f20" d="m985.69 69.375h57.422v-14.414l-36.04-39.473h37.31v-13.633h-60.235v14.297l36.715 39.59h-35.172v13.633"></path><path style="fill:#e4154b" d="m1059.6 0h69.102v69.121h-69.102v-69.121z"></path></g></g></svg>
                            </a>
                        </div>
                    </div>
                </header>

                <div id="headline">
                    <h1 class="title">${this.topicMetaDataText('name')}</h1>
                </div>

                <aside>
                    <h2 class="subtitle" @click="${this.toggleMenu}">
                        ${this.subtitle}
                        <vpu-icon name="chevron-down" style="color: red" id="menu-chevron-icon"></vpu-icon>
                    </h2>
                    <ul class="menu hidden">
                        ${menuTemplates}
                        <li class="close" @click="${this.toggleMenu}"><vpu-icon name="close" style="color: red"></vpu-icon></li>
                    </ul>
                </aside>

                <main>
                    <p class="description">${this.description}</p>
                    ${ this._renderActivity() }
                </main>

                <footer>
                    <vpu-build-info style="float: right" class="${prodClassMap}"></vpu-build-info>
                </footer>
            </div>
            </div>
        `;
    }
}

commonUtils.initAssetBaseURL('vpu-app-src');
commonUtils.defineCustomElement('vpu-app', VPUApp);
