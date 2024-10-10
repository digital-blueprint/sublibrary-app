import {createInstance} from './i18n.js';
import {css, html} from 'lit';
import {ScopedElementsMixin} from '@open-wc/scoped-elements';
import {LibraryElement} from './library-element.js';
import * as commonUtils from '@dbp-toolkit/common/utils';
import * as commonStyles from '@dbp-toolkit/common/styles';
import {DataTableView} from '@dbp-toolkit/data-table-view';
import {MiniSpinner, Button} from '@dbp-toolkit/common';
import {classMap} from 'lit/directives/class-map.js';
import $ from 'jquery';
import {getPersonDisplayName, escapeHtml} from './utils.js';
import {LibrarySelect} from './library-select.js';

class LibraryLoanList extends ScopedElementsMixin(LibraryElement) {
    constructor() {
        super();
        this.auth = {};
        this._i18n = createInstance();
        this.lang = this._i18n.language;
        this.entryPointUrl = '';
        this.personId = '';
        this.person = null;
        this.loans = [];
        this.sublibraryIri = '';
        this.abortController = null;
        this.overdueOnly = false;
        this.openOnly = false;

        let now = new Date();
        now.setDate(now.getDate() - 1);
        this.analyticsUpdateDate = now.toLocaleDateString(this.lang);
    }

    static get scopedElements() {
        return {
            'dbp-library-select': LibrarySelect,
            'dbp-mini-spinner': MiniSpinner,
            'dbp-button': Button,
            'dbp-data-table-view': DataTableView,
        };
    }

    /**
     * See: https://lit-element.polymer-project.org/guide/properties#conversion-type
     */
    static get properties() {
        return {
            ...super.properties,
            lang: {type: String},
            entryPointUrl: {type: String, attribute: 'entry-point-url'},
            sublibraryIri: {type: String, attribute: 'sublibrary-iri', reflect: true},
            loans: {type: Object, attribute: false},
            overdueOnly: {type: Boolean, attribute: false},
            openOnly: {type: Boolean, attribute: false},
            analyticsUpdateDate: {type: Object, attribute: false},
            auth: {type: Object},
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

        this.updateComplete.then(() => {
            // language=css
            const css = `
                table.dataTable tbody tr.odd {
                    background-color: var(--dbp-background);
                }
            `;

            this._('dbp-data-table-view').setCSSStyle(css);
            this.loadTable();
        });
    }

    update(changedProperties) {
        changedProperties.forEach((oldValue, propName) => {
            switch (propName) {
                case 'lang':
                    this._i18n.changeLanguage(this.lang);

                    // we need to update the column titles
                    this.buildTable();
                    break;
                case 'sublibraryIri':
                    this.loadTable();
                    break;
                case 'overdueOnly':
                case 'openOnly':
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

        if (!this.isLoggedIn()) return;

        if (this.sublibraryIri === '') {
            return;
        }

        const parts = this.sublibraryIri.split('/');
        const sublibraryIdentifier = parts[parts.length - 1];

        const apiUrl = this.entryPointUrl + '/sublibrary/book-loans?perPage=9999999&sublibrary=' + sublibraryIdentifier;
        const $loansLoadingIndicator = this.$('#loans-loading');

        $loansLoadingIndicator.show();

        // abort previous list fetch if it is still running
        if (this.abortController !== null) {
            this.abortController.abort();
        }

        this.abortController = new AbortController();
        const signal = this.abortController.signal;

        // load list of loans for person
        console.assert(this.auth.token);
        fetch(apiUrl, {
            headers: {
                'Content-Type': 'application/ld+json',
                Authorization: 'Bearer ' + this.auth.token,
            },
            signal: signal,
        })
            .then((result) => {
                if (!result.ok) throw result;

                if (result.headers.has('x-analytics-update-date')) {
                    const date = new Date(result.headers.get('x-analytics-update-date'));
                    this.analyticsUpdateDate =
                        date.toLocaleDateString(this.lang) +
                        ' ' +
                        date.toLocaleTimeString(this.lang);
                }

                return result.json();
            })
            .then((result) => {
                that.loans = result['hydra:member'];
                that.buildTable();
                $loansLoadingIndicator.hide();
            })
            .catch((error) => {
                that.handleFetchError(error, that._i18n.t('loan-list.error-load-loans'));
                $loansLoadingIndicator.hide();
            });
    }

    buildTable() {
        const $loanListBlock = this.$('#loan-list-block');
        const $noLoansBlock = this.$('#no-loans-block');
        const that = this;
        const i18n = this._i18n;

        if (this.loans.length > 0) {
            const vdtv1 = this._('#loan-loans-1');
            if (vdtv1 !== null) {
                const columns = [
                    {title: i18n.t('book-list.book-title')},
                    {title: i18n.t('loan-list.book-author')},
                    {title: i18n.t('book-list.book-barcode')},
                    {title: i18n.t('loan-list.borrower-name')},
                    {title: i18n.t('loan-list.start-date')},
                    null,
                    {title: i18n.t('loan-list.due-date')},
                    null,
                    {title: i18n.t('loan-list.return-date')},
                    null,
                    {title: i18n.t('book-list.book-location-identifier')},
                    {title: i18n.t('book-list.book-description')},
                    '',
                ];

                let createdCell = (td, cellData, rowData, row, col) => {
                    // Recreate the content from the correct shadow root registry
                    let div = that.createScopedElement('div');
                    div.innerHTML = cellData;
                    while (td.lastChild) {
                        td.removeChild(td.lastChild);
                    }
                    td.append(...div.children);
                };

                // sorting will be done by hidden columns
                // responsivePriority see https://datatables.net/extensions/responsive/priority
                const columnDefs = [
                    {targets: [4], orderData: [5]},
                    {targets: [5], visible: false},
                    {targets: [6], orderData: [7]},
                    {targets: [7], visible: false},
                    {targets: [8], orderData: [9]},
                    {targets: [9], visible: false},
                    {targets: [11], responsivePriority: 10001},
                    {targets: [12], sortable: false, createdCell: createdCell},
                ];

                const currentDate = new Date();
                const tbl = [];

                this.loans.forEach(function (loan) {
                    const startTime = new Date(loan.startTime);
                    const endTime = new Date(loan.endTime);
                    const returnTime = new Date(loan.returnTime);

                    if (that.openOnly && loan.returnTime !== null) {
                        return;
                    }

                    if (that.overdueOnly && (currentDate < endTime || loan.returnTime !== null)) {
                        return;
                    }

                    let button = 'dbp-button';
                    const row = [
                        escapeHtml(loan.object.book.title),
                        escapeHtml(loan.object.book.author),
                        loan.object.barcode,
                        getPersonDisplayName(loan.borrower),
                        startTime.toLocaleDateString('de-AT'),
                        loan.startTime,
                        endTime.toLocaleDateString('de-AT'),
                        loan.endTime,
                        loan.returnTime !== null ? returnTime.toLocaleDateString('de-AT') : '',
                        loan.returnTime,
                        loan.object.locationIdentifier,
                        loan.object.description,
                        `<div class="button-col">
                            <${button} data-id="${
                            loan['@id']
                        }" data-type="contact" data-book-name="${escapeHtml(loan.object.name)}"
                                        value="${i18n.t(
                                            'renew-loan.contact-value'
                                        )}" name="send" type="is-small"
                                        title="${i18n.t('renew-loan.contact-title', {
                                            personName: getPersonDisplayName(loan.borrower),
                                        })}" no-spinner-on-click></${button}>
                        </div>`,
                    ];
                    tbl.push(row);
                });
                vdtv1.set_columns(columns).set_columnDefs(columnDefs).set_datatable(tbl);
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

            #loan-list-block,
            #no-loans-block {
                display: none;
            }
            form,
            table {
                width: 100%;
            }

            #no-loans-block {
                font-weight: bold;
            }
        `;
    }

    toggleOverdueOnly() {
        this.overdueOnly = !this.overdueOnly;
    }

    toggleOpenOnly() {
        this.openOnly = !this.openOnly;
    }

    onSublibraryChanged(e) {
        this.sublibraryIri = e.detail.value;
    }

    /**
     * Handles all clicks on the data table
     * @param e
     */
    async onDataTableClick(e) {
        const path = e.composedPath();
        let button,
            buttonIndex = -1;
        const i18n = this._i18n;

        // search for the dbp-button
        path.some((item, index) => {
            if (
                item.nodeName?.toUpperCase() === 'dbp-button'.toUpperCase()
            ) {
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

        if (button.hasAttribute('disabled')) {
            return;
        }

        const type = button.getAttribute('data-type');
        const loanId = button.getAttribute('data-id');

        // check with button was clicked
        switch (type) {
            case 'contact': {
                button.start();
                try {
                    const apiUrl = this.entryPointUrl + loanId;

                    // we need to load the loan because we cannot get the borrower's email address via Alma Analytics
                    let result = await fetch(apiUrl, {
                        headers: {
                            'Content-Type': 'application/ld+json',
                            Authorization: 'Bearer ' + this.auth.token,
                        },
                    });
                    if (!result.ok)
                        throw result;
                    let loan = await result.json();
                    const bookName = button.getAttribute('data-book-name');
                    const subject = i18n.t('renew-loan.contact-subject', {bookName: bookName});

                    let personUrl =  this.entryPointUrl + loan.borrower['@id'] + '?' + new URLSearchParams({'includeLocal': 'email'}).toString();
                    let personResult = await fetch(personUrl, {
                        headers: {
                            'Content-Type': 'application/ld+json',
                            Authorization: 'Bearer ' + this.auth.token,
                        },
                    });
                    if (!personResult.ok)
                        throw personResult;
                    let person = await personResult.json();

                    location.href = `mailto:${person.localData.email}?subject=${subject}`;
                } catch (error) {
                    this.handleFetchError(error, i18n.t('loan-list.error-load-loan'));
                } finally {
                    button.stop();
                }
                break;
            }
        }
    }

    render() {
        const i18n = this._i18n;

        return html`
            <form
                class="${classMap({
                    hidden: !this.isLoggedIn() || !this.hasLibraryPermissions() || this.isLoading(),
                })}">
                <div class="field">
                    ${i18n.t('loan-list.current-state')}: ${this.analyticsUpdateDate}
                </div>
                <div class="field">
                    <label class="label">${i18n.t('organization-select.label')}</label>
                    <div class="control">
                        <dbp-library-select
                            subscribe="lang:lang,entry-point-url:entry-point-url,auth:auth"
                            value="${this.sublibraryIri}"
                            @change="${this.onSublibraryChanged}"></dbp-library-select>
                    </div>
                </div>
                <dbp-mini-spinner
                    id="loans-loading"
                    text="${i18n.t('loan-list.mini-spinner-text')}"
                    style="font-size: 2em; display: none;"></dbp-mini-spinner>
                <div id="loan-list-block">
                    <div class="field">
                        <label class="label">
                            <input
                                type="checkbox"
                                .checked=${this.openOnly}
                                @click=${this.toggleOpenOnly}
                                .disabled=${this.overdueOnly} />
                            ${i18n.t('loan-list.open-only')}
                        </label>
                    </div>
                    <div class="field">
                        <label class="label">
                            <input
                                type="checkbox"
                                .checked=${this.overdueOnly}
                                @click=${this.toggleOverdueOnly} />
                            ${i18n.t('loan-list.overdue-only')}
                        </label>
                    </div>
                    <div class="field">
                        <label class="label">${i18n.t('loan-list.loans')}</label>
                        <div class="control">
                            <dbp-data-table-view
                                searching
                                paging
                                exportable
                                export-name="${i18n.t('loan-list.export-name', {
                                    organizationCode: this.getOrganizationCode(),
                                })}"
                                subscribe="lang:lang"
                                id="loan-loans-1"
                                @click="${(e) => this.onDataTableClick(e)}"></dbp-data-table-view>
                        </div>
                    </div>
                </div>
                <div id="no-loans-block">${i18n.t('loan-list.no-loans')}</div>
            </form>
            <div
                class="notification is-warning ${classMap({
                    hidden: this.isLoggedIn() || this.isLoading(),
                })}">
                ${i18n.t('error-login-message')}
            </div>
            <div
                class="notification is-danger ${classMap({
                    hidden: this.hasLibraryPermissions() || !this.isLoggedIn() || this.isLoading(),
                })}">
                ${i18n.t('error-permission-message')}
            </div>
            <div class="${classMap({hidden: !this.isLoading()})}">
                <dbp-mini-spinner></dbp-mini-spinner>
            </div>
        `;
    }
}

commonUtils.defineCustomElement('dbp-sublibrary-loan-list', LibraryLoanList);
