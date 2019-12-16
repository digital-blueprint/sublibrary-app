import {i18n} from './i18n.js';
import {css, html} from 'lit-element';
import VPULibraryLitElement from "./vpu-library-lit-element";
import * as commonUtils from 'vpu-common/utils';
import * as commonStyles from 'vpu-common/styles';
import 'vpu-data-table-view';
import * as errorUtils from "vpu-common/error";
import './vpu-knowledge-base-organisation-select.js';

class LibraryLoanList extends VPULibraryLitElement {
    constructor() {
        super();
        this.lang = 'de';
        this.entryPointUrl = commonUtils.getAPiUrl();
        this.personId = "";
        this.person = null;
        this.loans = [];
        this.organizationId = '';
        this.abortController = null;
        this.overdueOnly = false;
    }

    /**
     * See: https://lit-element.polymer-project.org/guide/properties#conversion-type
     */
    static get properties() {
        return {
            lang: { type: String },
            entryPointUrl: { type: String, attribute: 'entry-point-url' },
            organizationId: { type: String, attribute: 'organization-id', reflect: true},
            loans: { type: Object, attribute: false },
            overdueOnly: { type: Boolean, attribute: false },
        };
    }

    connectedCallback() {
        super.connectedCallback();

        this.updateComplete.then(()=>{
            // show user interface when logged in person object is available
            this.callInitUserInterface();

            // language=css
            const css = `
                table.dataTable tbody tr.odd {
                    background-color: #f9f9f9;
                }
            `;

            this._("vpu-data-table-view").setCSSStyle(css);
            this.loadTable();
        });
    }

    update(changedProperties) {
        changedProperties.forEach((oldValue, propName) => {
            switch (propName) {
                case "lang":
                    i18n.changeLanguage(this.lang);

                    // we need to update the column titles
                    this.buildTable();
                    break;
                case "organizationId":
                    this.loadTable();
                    break;
                case "overdueOnly":
                    this.buildTable();
                    break;
            }
        });

        super.update(changedProperties);
    }

    loadTable() {
        const that = this;
        const $loanListBlock = that.$('#loan-list-block');
        const $noLoansBlock = that.$('#no-loans-block');
        $loanListBlock.hide();
        $noLoansBlock.hide();

        if (this.organizationId === "") {
            return;
        }

        const apiUrl = this.entryPointUrl + this.organizationId + "/library-book-loans";
        const $loansLoadingIndicator = this.$('#loans-loading');

        $loansLoadingIndicator.show();

        // abort previous list fetch if it is still running
        if (this.abortController !== null) {
            this.abortController.abort();
        }

        this.abortController = new AbortController();
        const signal = this.abortController.signal;

        // load list of loans for person
        fetch(apiUrl, {
            headers: {
                'Content-Type': 'application/ld+json',
                'Authorization': 'Bearer ' + window.VPUAuthToken,
            },
            signal: signal,
        })
            .then(result => {
                $loansLoadingIndicator.hide();
                if (!result.ok) throw result;
                return result.json();
            })
            .then(result => {
                that.loans = result['hydra:member'];
                that.buildTable();
            }).catch(error => errorUtils.handleFetchError(error, i18n.t('loan-list.error-load-loans')));
    }

    buildTable() {
        const $loanListBlock = this.$('#loan-list-block');
        const $noLoansBlock = this.$('#no-loans-block');
        const that = this;

        if (this.loans.length > 0) {
            const vdtv1 = this._('#loan-loans-1');
            if (vdtv1 !== null) {
                const columns = [
                    {title: i18n.t('book-list.book-title')},
                    {title: i18n.t('book-list.book-author')},
                    {title: i18n.t('book-list.book-barcode')},
                    {title: i18n.t('loan-list.borrower-name')},
                    {title: i18n.t('loan-list.start-date')},
                    null,
                    {title: i18n.t('loan-list.due-date')},
                    null,
                    {title: i18n.t('loan-list.return-date')},
                    null,
                ];

                // sorting will be done by hidden columns
                const columnDefs = [
                    {targets: [4], orderData: [5]},
                    {targets: [5], visible: false},
                    {targets: [6], orderData: [7]},
                    {targets: [7], visible: false},
                    {targets: [8], orderData: [9]},
                    {targets: [9], visible: false},
                ];

                const currentDate = new Date();
                const tbl = [];

                this.loans.forEach(function (loan) {
                    const startTime = new Date(loan.startTime);
                    const endTime = new Date(loan.endTime);
                    const returnTime = new Date(loan.returnTime);

                    if (that.overdueOnly && (currentDate < endTime || loan.returnTime !== null)) {
                        return;
                    }

                    const row = [
                        loan.object.book.title,
                        loan.object.book.author,
                        loan.object.barcode,
                        loan.borrower.name,
                        startTime.toLocaleDateString("de-AT"),
                        loan.startTime,
                        endTime.toLocaleDateString("de-AT"),
                        loan.endTime,
                        loan.returnTime !== null ? returnTime.toLocaleDateString("de-AT") : "",
                        loan.returnTime,
                    ];
                    tbl.push(row);
                });
                vdtv1.set_columns(columns)
                    .set_columnDefs(columnDefs)
                    .set_datatable(tbl);
            }
            $loanListBlock.show();
        } else {
            $noLoansBlock.show();
        }
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

            #loan-list-block, #permission-error-block, #no-loans-block { display: none; }
            form, table {width: 100%}

            #no-loans-block { font-weight: bold; }
        `;
    }

    toggleOverdueOnly() {
        this.overdueOnly = !this.overdueOnly
    }

    onOrgUnitCodeChanged(e) {
        this.organizationId = e.detail.value;
    }

    render() {
        return html`
            <form class="hidden">
                <div class="field">
                    <label class="label">${i18n.t('organization-select.label')}</label>
                    <div class="control">
                        <vpu-knowledge-base-organization-select lang="${this.lang}"
                                                                value="${this.organizationId}"
                                                                @change="${this.onOrgUnitCodeChanged}"></vpu-knowledge-base-organization-select>
                    </div>
                </div>
                <vpu-mini-spinner id="loans-loading" style="font-size: 2em; display: none;"></vpu-mini-spinner>
                <div id="loan-list-block">
                    <div class="field">
                        <label class="label">
                            <input type="checkbox" .checked=${this.overdueOnly} @click=${this.toggleOverdueOnly}>
                            ${i18n.t('loan-list.overdue-only')}
                        </label>
                    </div>
                    <div class="field">
                        <label class="label">${i18n.t('loan-list.loans')}</label>
                        <div class="control">
                            <vpu-data-table-view searching paging exportable export-name="${i18n.t('loan-list.loans')}"
                                                 lang="${this.lang}" id="loan-loans-1"></vpu-data-table-view>
                        </div>
                    </div>
                </div>
                <div id="no-loans-block">
                    ${i18n.t('loan-list.no-loans')}
                </div>
            </form>
            <div class="notification is-warning" id="login-error-block">
                ${i18n.t('error-login-message')}
            </div>
            <div class="notification is-danger" id="permission-error-block">
                ${i18n.t('error-permission-message')}
            </div>
        `;
    }
}

commonUtils.defineCustomElement('vpu-library-loan-list', LibraryLoanList);
