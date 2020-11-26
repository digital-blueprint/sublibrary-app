import {createI18nInstance} from './i18n.js';
import {numberFormat} from '@dbp-toolkit/common/i18next.js';
import {css, html} from 'lit-element';
import {ScopedElementsMixin} from '@open-wc/scoped-elements';
import {LibraryElement} from "./library-element.js";
import * as commonUtils from '@dbp-toolkit/common/utils';
import * as commonStyles from '@dbp-toolkit/common/styles';
import * as errorUtils from "@dbp-toolkit/common/error";
import {OrganizationSelect} from './organization-select.js';
import {MiniSpinner} from '@dbp-toolkit/common';
import {classMap} from 'lit-html/directives/class-map.js';
import $ from "jquery";

const i18n = createI18nInstance();

class LibraryBudget extends ScopedElementsMixin(LibraryElement) {
    constructor() {
        super();
        this.lang = i18n.language;
        this.entryPointUrl = commonUtils.getAPiUrl();
        this.monetaryAmounts = [];
        this.organizationId = '';
        this.abortController = null;

        let now = new Date();
        now.setDate(now.getDate() - 1);
        this.analyticsUpdateDate = now.toLocaleDateString(this.lang);
    }

    static get scopedElements() {
        return {
            'dbp-knowledge-base-organization-select': OrganizationSelect,
            'dbp-mini-spinner': MiniSpinner,
        };
    }

    $(selector) {
        return $(this._(selector));
    }

    /**
     * See: https://lit-element.polymer-project.org/guide/properties#conversion-type
     */
    static get properties() {
        return {
            lang: { type: String },
            entryPointUrl: { type: String, attribute: 'entry-point-url' },
            organizationId: { type: String, attribute: 'organization-id', reflect: true},
            analyticsUpdateDate: { type: Object, attribute: false },
            monetaryAmounts: { type: Array, attribute: false },
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
        const that = this;
        const $budgetBlock = that.$('#budget-block');
        $budgetBlock.hide();

        if (!this.isLoggedIn())
            return;

        if (this.organizationId === "") {
            return;
        }

        const parts = this.organizationId.split('/');
        const organizationIdentifier = parts[parts.length - 1];
        const apiUrl = this.entryPointUrl + "/library_budget_monetary_amounts?organization=" + organizationIdentifier;
        const $budgetLoadingIndicator = this.$('#budget-loading');

        $budgetLoadingIndicator.show();

        // abort previous list fetch if it is still running
        if (this.abortController !== null) {
            this.abortController.abort();
        }

        this.abortController = new AbortController();
        const signal = this.abortController.signal;

        console.assert(window.DBPAuthToken);
        fetch(apiUrl, {
            headers: {
                'Content-Type': 'application/ld+json',
                'Authorization': 'Bearer ' + window.DBPAuthToken,
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
                $budgetLoadingIndicator.hide();
                $budgetBlock.show();
            }).catch(error => {
                errorUtils.handleFetchError(error, i18n.t('budget.load-error'));
                $budgetLoadingIndicator.hide();
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

            .hidden {display: none;}
            #budget-block { display: none; }

            table th {
                padding: 8px;
            }
        `;
    }

    onOrgUnitCodeChanged(e) {
        this.organizationId = e.detail.value;
    }

    getMonetaryAmountRow(name) {
        return this.monetaryAmounts[name] ? html`
            <tr>
                <th>${i18n.t('budget.' + name)}</th>
                <td>${numberFormat(i18n, this.monetaryAmounts[name].value)} ${this.monetaryAmounts[name].currency}</td>
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
                        <dbp-knowledge-base-organization-select lang="${this.lang}"
                                                                value="${this.organizationId}"
                                                                @change="${this.onOrgUnitCodeChanged}"></dbp-knowledge-base-organization-select>
                    </div>
                </div>
                <dbp-mini-spinner id="budget-loading" text="${i18n.t('budget.mini-spinner-text')}" style="font-size: 2em; display: none;"></dbp-mini-spinner>
                <div id="budget-block" class="field">
                    <label class="label">${i18n.t('budget.budget-key-values')}</label>
                    <div class="control">
                        <table>
                            ${this.getMonetaryAmountRow('taa')}
                            ${this.getMonetaryAmountRow('taa-tcb')}
                            ${this.getMonetaryAmountRow('tab')}
                            ${this.getMonetaryAmountRow('tcb')}
                            ${this.getMonetaryAmountRow('tcb-tab')}
                        </table>
                    </div>
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
