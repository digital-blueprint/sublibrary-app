import {createI18nInstance} from './i18n.js';
import {numberFormat} from '@dbp-toolkit/common/i18next.js';
import {css, html} from 'lit-element';
import {ScopedElementsMixin} from '@open-wc/scoped-elements';
import {LibraryElement} from "./library-element.js";
import * as commonUtils from '@dbp-toolkit/common/utils';
import * as commonStyles from '@dbp-toolkit/common/styles';
import {OrganizationSelect} from '@dbp-toolkit/organization-select';
import {MiniSpinner} from '@dbp-toolkit/common';
import {classMap} from 'lit-html/directives/class-map.js';

const i18n = createI18nInstance();

const pageStatus = {
    'none': 0,
    'loading': 1,
    'showBudget': 2,
    'noBudget': 3,
};

class LibraryBudget extends ScopedElementsMixin(LibraryElement) {
    constructor() {
        super();
        this.auth = {};
        this.lang = i18n.language;
        this.entryPointUrl = '';
        this.monetaryAmounts = [];
        this.organizationId = '';
        this.abortController = null;
        this.pageStatus = pageStatus.none;

        let now = new Date();
        now.setDate(now.getDate() - 1);
        this.analyticsUpdateDate = now.toLocaleDateString(this.lang);
    }

    static get scopedElements() {
        return {
            'dbp-organization-select': OrganizationSelect,
            'dbp-mini-spinner': MiniSpinner,
        };
    }

    /**
     * See: https://lit-element.polymer-project.org/guide/properties#conversion-type
     */
    static get properties() {
        return {
            ...super.properties,
            lang: { type: String },
            entryPointUrl: { type: String, attribute: 'entry-point-url' },
            organizationId: { type: String, attribute: 'organization-id', reflect: true},
            analyticsUpdateDate: { type: Object, attribute: false },
            monetaryAmounts: { type: Array, attribute: false },
            pageStatus: { type: Boolean, attribute: false },
            auth: { type: Object },
        };
    }

    loginCallback() {
        super.loginCallback();
        this.loadBudget();
    }

    connectedCallback() {
        super.connectedCallback();

        this.updateComplete.then(()=>{
            this.loadBudget();
        });
    }

    update(changedProperties) {
        changedProperties.forEach((oldValue, propName) => {
            if (propName === "lang") {
                i18n.changeLanguage(this.lang);
            } else if (propName === "organizationId") {
                this.loadBudget();
            }
        });

        super.update(changedProperties);
    }

    disconnectedCallback() {
        if (this.abortController !== null) {
            this.abortController.abort();
        }

        super.disconnectedCallback();
    }

    loadBudget() {
        if (!this.isLoggedIn() || this.organizationId === "") {
            return;
        }

        const that = this;
        this.pageStatus = pageStatus.loading;
        const parts = this.organizationId.split('/');
        const organizationIdentifier = parts[parts.length - 1];
        const apiUrl = this.entryPointUrl + "/library_budget_monetary_amounts?organization=" + organizationIdentifier;

        // abort previous list fetch if it is still running
        if (this.abortController !== null) {
            this.abortController.abort();
        }

        this.abortController = new AbortController();
        const signal = this.abortController.signal;

        console.assert(this.auth.token);
        fetch(apiUrl, {
            headers: {
                'Content-Type': 'application/ld+json',
                'Authorization': 'Bearer ' + this.auth.token,
            },
            signal: signal,
        })
            .then(result => {
                if (!result.ok) throw result;

                if (result.headers.has('x-analytics-update-date')) {
                    const date = new Date(result.headers.get('x-analytics-update-date'));
                    this.analyticsUpdateDate = date.toLocaleDateString(this.lang) + " " +
                            date.toLocaleTimeString(this.lang);
                }

                return result.json();
            })
            .then(result => {
                let monetaryAmounts = {};

                result['hydra:member'].forEach((monetaryAmount) => {
                    monetaryAmounts[monetaryAmount.name] = monetaryAmount;
                });

                that.monetaryAmounts = monetaryAmounts;
                that.pageStatus = pageStatus.showBudget;
            }).catch(error => {
                if (error.status === 404) {
                    that.pageStatus = pageStatus.noBudget;
                } else {
                    that.pageStatus = pageStatus.none;
                    this.handleFetchError(error, i18n.t('budget.load-error'));
                }
            });
    }

    onLanguageChanged(e) {
        this.lang = e.detail.lang;
    }

    static get styles() {
        // language=css
        return css`
            ${commonStyles.getThemeCSS()}
            ${commonStyles.getGeneralCSS()}
            ${commonStyles.getNotificationCSS()}

            table th {
                padding: 8px;
            }
        `;
    }

    onOrgUnitCodeChanged(e) {
        this.organizationId = e.detail.value;
    }

    getMonetaryAmountRow(name) {
        // For i18next scanner
        i18n.t('budget.taa');
        i18n.t('budget.taa-tcb');
        i18n.t('budget.tcb');
        i18n.t('budget.tcb-tab');
        i18n.t('budget.tab');

        return this.monetaryAmounts[name] ? html`
            <tr>
                <th>${i18n.t('budget.' + name)}</th>
                <td>${numberFormat(i18n, this.monetaryAmounts[name].value, { style: 'currency', currency: this.monetaryAmounts[name].currency })}</td>
            </tr>
        ` : ``;
    }

    render() {
        return html`
            <div class="field">
                ${i18n.t('order-list.current-state')}: ${this.analyticsUpdateDate}
            </div>
            <div class="${classMap({hidden: !this.isLoggedIn() || !this.hasLibraryPermissions() || this.isLoading()})}">
                <div class="field">
                    <label class="label">${i18n.t('organization-select.label')}</label>
                    <div class="control">
                        <dbp-organization-select subscribe="lang:lang,entry-point-url:entry-point-url,auth:auth"
                                                                context="library-manager"
                                                                value="${this.organizationId}"
                                                                @change="${this.onOrgUnitCodeChanged}"></dbp-organization-select>
                    </div>
                </div>
                <dbp-mini-spinner class="${classMap({hidden: this.pageStatus !== pageStatus.loading})}" text="${i18n.t('budget.mini-spinner-text')}" style="font-size: 2em;"></dbp-mini-spinner>
                <div class="field ${classMap({hidden: this.pageStatus !== pageStatus.showBudget})}">
                    <label class="label">${i18n.t('budget.budget-key-values')}</label>
                    <div class="control">
                        <table>
                            ${this.getMonetaryAmountRow('taa')}
                            ${this.getMonetaryAmountRow('taa-tcb')}
                            ${this.getMonetaryAmountRow('tcb')}
                            ${this.getMonetaryAmountRow('tcb-tab')}
                            ${this.getMonetaryAmountRow('tab')}
                        </table>
                    </div>
                </div>
                <div class="field ${classMap({hidden: this.pageStatus !== pageStatus.noBudget})}">
                    ${i18n.t('budget.no-budget')}
                </div>
            </div>
            <div class="notification is-warning ${classMap({hidden: this.isLoggedIn() || this.isLoading()})}">
                ${i18n.t('error-login-message')}
            </div>
            <div class="notification is-danger ${classMap({hidden: this.hasLibraryPermissions() || !this.isLoggedIn() || this.isLoading()})}">
                ${i18n.t('error-permission-message')}
            </div>
            <div class="${classMap({hidden: !this.isLoading()})}">
                <dbp-mini-spinner></dbp-mini-spinner>
            </div>
        `;
    }
}

commonUtils.defineCustomElement('dbp-library-budget', LibraryBudget);
