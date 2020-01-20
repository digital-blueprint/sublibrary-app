import {createI18nInstance} from './i18n.js';
import {css, html} from 'lit-element';
import VPULibraryLitElement from "./vpu-library-lit-element";
import * as commonUtils from 'vpu-common/utils';
import * as commonStyles from 'vpu-common/styles';
import 'vpu-data-table-view';
import * as errorUtils from "vpu-common/error";
import './vpu-knowledge-base-organisation-select.js';
import 'vpu-common/vpu-mini-spinner.js';
import {classMap} from 'lit-html/directives/class-map.js';
import $ from "jquery";

const i18n = createI18nInstance();

class LibraryLoanList extends VPULibraryLitElement {
    constructor() {
        super();
        this.lang = i18n.language;
        this.entryPointUrl = commonUtils.getAPiUrl();
        this.personId = "";
        this.person = null;
        this.loans = [];
        this.organizationId = '';
        this.abortController = null;
        this.overdueOnly = false;

        let now = new Date();
        now.setDate(now.getDate() - 1);
        this.analyticsUpdateDate = now.toLocaleDateString(this.lang);
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
            analyticsUpdateDate: { type: Object, attribute: false },
        };
    }

    $(selector) {
        return $(this._(selector));
    }

    loginCallback() {
        super.loginCallback();

        this.loadTable();
    }

    connectedCallback() {
        super.connectedCallback();

        this.updateComplete.then(()=>{
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

    disconnectedCallback() {
        if (this.abortController !== null) {
            this.abortController.abort();
        }

        super.disconnectedCallback();
    }

    loadTable() {
        const that = this;
        const $loanListBlock = that.$('#loan-list-block');
        const $noLoansBlock = that.$('#no-loans-block');
        $loanListBlock.hide();
        $noLoansBlock.hide();

        if (!this.isLoggedIn())
            return;

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
        console.assert(window.VPUAuthToken);
        fetch(apiUrl, {
            headers: {
                'Content-Type': 'application/ld+json',
                'Authorization': 'Bearer ' + window.VPUAuthToken,
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
                that.loans = result['hydra:member'];
                that.buildTable();
                $loansLoadingIndicator.hide();
            }).catch(error => {
                errorUtils.handleFetchError(error, i18n.t('loan-list.error-load-loans'));
                $loansLoadingIndicator.hide();
            });
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
                    '',
                ];

                // sorting will be done by hidden columns
                const columnDefs = [
                    {targets: [4], orderData: [5]},
                    {targets: [5], visible: false},
                    {targets: [6], orderData: [7]},
                    {targets: [7], visible: false},
                    {targets: [8], orderData: [9]},
                    {targets: [9], visible: false},
                    {targets: [10], sortable: false},
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
                        `<div class="button-col">
                            <vpu-button data-id="${loan['@id']}" data-type="contact" data-book-name="${loan.object.name}"
                                        value="${i18n.t('renew-loan.contact-value')}" name="send" type="is-small"
                                        title="${i18n.t('renew-loan.contact-title', {personName: loan.borrower.name})}" no-spinner-on-click></vpu-button>
                        </div>`
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

    static get styles() {
        // language=css
        return css`
            ${commonStyles.getThemeCSS()}
            ${commonStyles.getGeneralCSS()}
            ${commonStyles.getNotificationCSS()}

            .hidden {
                display: none;
            }

            #loan-list-block, #no-loans-block { display: none; }
            form, table {width: 100%}

            #no-loans-block { font-weight: bold; }
        `;
    }

    toggleOverdueOnly() {
        this.overdueOnly = !this.overdueOnly;
    }

    onOrgUnitCodeChanged(e) {
        this.organizationId = e.detail.value;
    }

    /**
     * Handles all clicks on the data table
     *
     * @param e
     */
    onDataTableClick(e) {
        const path = e.composedPath();
        let button, buttonIndex = -1;

        // search for the vpu-button
        path.some((item, index) => {
            if (item.nodeName === "VPU-BUTTON") {
                button = item;
                buttonIndex = index;

                return true;
            }
        });

        // if the button was not found it wasn't clicked
        if (buttonIndex === -1) {
            return;
        }

        e.preventDefault();

        if (button.hasAttribute("disabled")) {
            return;
        }

        const type = button.getAttribute("data-type");
        const loanId = button.getAttribute("data-id");

        // check with button was clicked
        switch(type) {
            case "contact": {
                button.start();
                const apiUrl = this.entryPointUrl + loanId;

                // we need to load the loan because we cannot get the borrower's email address via Alma Analytics
                fetch(apiUrl, {
                    headers: {
                        'Content-Type': 'application/ld+json',
                        'Authorization': 'Bearer ' + window.VPUAuthToken,
                    },
                })
                    .then(result => {
                        button.stop();
                        if (!result.ok) throw result;
                        return result.json();
                    })
                    .then(loan => {
                        const bookName = button.getAttribute("data-book-name");
                        const subject = i18n.t('renew-loan.contact-subject', {bookName: bookName});

                        // open mail client with new mail
                        location.href = `mailto:${loan.borrower.email}?subject=${subject}`;
                    }).catch(error => errorUtils.handleFetchError(error, i18n.t('loan-list.error-load-loan')));
                break;
            }
        }
    }

    render() {
        return html`
            <form class="${classMap({hidden: !this.isLoggedIn() || !this.hasLibraryPermissions()})}">
                <div class="field">
                    ${i18n.t('loan-list.current-state')}: ${this.analyticsUpdateDate}
                </div>
                <div class="field">
                    <label class="label">${i18n.t('organization-select.label')}</label>
                    <div class="control">
                        <vpu-knowledge-base-organization-select lang="${this.lang}"
                                                                value="${this.organizationId}"
                                                                @change="${this.onOrgUnitCodeChanged}"></vpu-knowledge-base-organization-select>
                    </div>
                </div>
                <vpu-mini-spinner id="loans-loading" text="${i18n.t('loan-list.mini-spinner-text')}" style="font-size: 2em; display: none;"></vpu-mini-spinner>
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
                            <vpu-data-table-view searching paging exportable export-name="${i18n.t('loan-list.export-name', {organizationCode: this.getOrganizationCode()})}"
                                                 lang="${this.lang}" id="loan-loans-1" @click="${(e) => this.onDataTableClick(e)}"></vpu-data-table-view>
                        </div>
                    </div>
                </div>
                <div id="no-loans-block">
                    ${i18n.t('loan-list.no-loans')}
                </div>
            </form>
            <div class="notification is-warning ${classMap({hidden: this.isLoggedIn()})}">
                ${i18n.t('error-login-message')}
            </div>
            <div class="notification is-danger ${classMap({hidden: this.hasLibraryPermissions() || !this.isLoggedIn()})}">
                ${i18n.t('error-permission-message')}
            </div>
        `;
    }
}

commonUtils.defineCustomElement('vpu-library-loan-list', LibraryLoanList);
