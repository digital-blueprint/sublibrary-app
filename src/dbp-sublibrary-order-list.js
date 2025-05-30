import {createInstance} from './i18n.js';
import {numberFormat} from '@dbp-toolkit/common/i18next.js';
import {css, html} from 'lit';
import {ScopedElementsMixin} from '@dbp-toolkit/common';
import {LibraryElement} from './library-element.js';
import * as commonUtils from '@dbp-toolkit/common/utils';
import * as commonStyles from '@dbp-toolkit/common/styles';
import {DataTableView} from '@dbp-toolkit/data-table-view';
import {MiniSpinner} from '@dbp-toolkit/common';
import {classMap} from 'lit/directives/class-map.js';
import $ from 'jquery';
import {LibrarySelect} from './library-select.js';

/**
 * Returns a translated label for the given status
 * @param i18n
 * @param {string} status
 * @returns {string} A status label for the actve language
 */
function getEventStatusName(i18n, status) {
    if (status === 'active') {
        return i18n.t('order-list.status-name-active');
    } else if (status === 'cancelled') {
        return i18n.t('order-list.status-name-cancelled');
    } else if (status === 'closed') {
        return i18n.t('order-list.status-name-closed');
    } else {
        return status;
    }
}

class LibraryOrderList extends ScopedElementsMixin(LibraryElement) {
    constructor() {
        super();
        this.auth = {};
        this._i18n = createInstance();
        this.lang = this._i18n.language;
        this.entryPointUrl = '';
        this.personId = '';
        this.person = null;
        this.books = [];
        this.sublibraryIri = '';
        this.abortController = null;
        this.openOnly = false;

        let now = new Date();
        now.setDate(now.getDate() - 1);
        this.analyticsUpdateDate = now.toLocaleDateString(this.lang);
    }

    static get scopedElements() {
        return {
            'dbp-library-select': LibrarySelect,
            'dbp-data-table-view': DataTableView,
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
            ...super.properties,
            lang: {type: String},
            entryPointUrl: {type: String, attribute: 'entry-point-url'},
            sublibraryIri: {type: String, attribute: 'sublibrary-iri', reflect: true},
            books: {type: Object, attribute: false},
            openOnly: {type: Boolean, attribute: false},
            analyticsUpdateDate: {type: Object, attribute: false},
            auth: {type: Object},
        };
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
                    this.loadTable();
                    break;
                case 'sublibraryIri':
                case 'openOnly':
                    this.loadTable();
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
        const i18n = this._i18n;
        const that = this;
        const $bookListBlock = that.$('#book-list-block');
        const $noBooksBlock = that.$('#no-books-block');
        $bookListBlock.hide();
        $noBooksBlock.hide();

        if (!this.isLoggedIn()) return;

        if (this.sublibraryIri === '') {
            return;
        }

        const parts = this.sublibraryIri.split('/');
        const sublibraryIdentifier = parts[parts.length - 1];

        const apiUrl =
            this.entryPointUrl +
            '/sublibrary/book-orders?perPage=9999999&sublibrary=' +
            sublibraryIdentifier;
        const $booksLoadingIndicator = this.$('#books-loading');

        $booksLoadingIndicator.show();

        // abort previous list fetch if it is still running
        if (this.abortController !== null) {
            this.abortController.abort();
        }

        this.abortController = new AbortController();
        const signal = this.abortController.signal;

        console.assert(this.auth.token);
        // load list of books for person
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
                that.books = result['hydra:member'];

                if (that.books.length > 0) {
                    const vdtv1 = that._('#book-books-1');
                    if (vdtv1 !== null) {
                        const columns = [
                            {title: i18n.t('book-list.book-title')},
                            {title: i18n.t('book-list.book-author')},
                            {title: i18n.t('book-list.book-isbn')},
                            {title: i18n.t('order-list.order-date')},
                            null,
                            {title: i18n.t('order-list.order-number')},
                            {title: i18n.t('order-list.book-price')},
                            null,
                            {title: i18n.t('order-list.order-status')},
                            {title: i18n.t('order-list.receiving -note')},
                        ];

                        // sorting will be done by hidden columns
                        const columnDefs = [
                            {targets: [3], orderData: [4]},
                            {targets: [4], visible: false},
                            {targets: [6], orderData: [7]},
                            {targets: [7], visible: false},
                        ];

                        const tbl = [];
                        that.books.forEach(function (bookOrder) {
                            if (
                                that.openOnly &&
                                bookOrder.orderedItem.orderDelivery.deliveryStatus.eventStatus
                                    .name !== 'active'
                            ) {
                                return;
                            }

                            const orderDate = new Date(bookOrder.orderDate);
                            let priceString =
                                bookOrder.orderedItem.price > 0
                                    ? numberFormat(i18n, bookOrder.orderedItem.price, {
                                          style: 'currency',
                                          currency: bookOrder.orderedItem.priceCurrency,
                                      })
                                    : '';

                            const row = [
                                bookOrder.orderedItem.orderedItem.title,
                                bookOrder.orderedItem.orderedItem.author,
                                bookOrder.orderedItem.orderedItem.isbn,
                                orderDate.toLocaleDateString('de-AT'),
                                bookOrder.orderDate,
                                bookOrder.orderNumber,
                                priceString,
                                bookOrder.orderedItem.price,
                                getEventStatusName(
                                    i18n,
                                    bookOrder.orderedItem.orderDelivery.deliveryStatus.eventStatus
                                        .name,
                                ),
                                bookOrder.receivingNote,
                            ];
                            tbl.push(row);
                        });
                        vdtv1
                            .set_columns(columns)
                            .set_columnDefs(columnDefs)
                            .set_datatable(tbl)
                            .on('draw', this.table_draw.bind(that))
                            .draw();
                    }
                    $bookListBlock.show();
                } else {
                    $noBooksBlock.show();
                }

                $booksLoadingIndicator.hide();
            })
            .catch((error) => {
                that.handleFetchError(error, i18n.t('order-list.error-load-orders'));
                $booksLoadingIndicator.hide();
            });
    }

    onLanguageChanged(e) {
        this.lang = e.detail.lang;
    }

    toggleOpenOnly() {
        this.openOnly = !this.openOnly;
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

            #book-list-block,
            #no-books-block {
                display: none;
            }
            form,
            table {
                width: 100%;
            }

            #no-books-block {
                font-weight: bold;
            }
        `;
    }

    onSublibraryChanged(e) {
        this.sublibraryIri = e.detail.value;
    }

    table_draw() {
        const table = this.shadowRoot.querySelector('#book-books-1');
        table.columnReduce(7, function (a, b) {
            let a1 = 0;
            if (typeof a === 'string') {
                a1 = a.replace(',', '.').replace(' EUR', '') * 1;
            } else {
                a1 = a * 1;
            }
            let b1 = 0;
            if (typeof b === 'string') {
                b1 = b.replace(',', '.').replace(' EUR', '') * 1;
            } else {
                b1 = b * 1;
            }
            return a1 + b1;
        });
    }

    _onLoginClicked(e) {
        this.sendSetPropertyEvent('requested-login-status', 'logged-in');
        e.preventDefault();
    }

    render() {
        const i18n = this._i18n;
        return html`
            <form
                class="${classMap({
                    hidden: !this.isLoggedIn() || !this.hasLibraryPermissions() || this.isLoading(),
                })}">
                <div class="field">
                    ${i18n.t('order-list.current-state')}: ${this.analyticsUpdateDate}
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
                    id="books-loading"
                    text="${i18n.t('order-list.mini-spinner-text')}"
                    style="font-size: 2em; display: none;"></dbp-mini-spinner>
                <div id="book-list-block">
                    <!--
                    <div class="field">
                        <label class="label">
                            <input type="checkbox" .checked=${this.openOnly} @click=${this
                        .toggleOpenOnly} .disabled=${this.overdueOnly}>
                            ${i18n.t('order-list.open-only')}
                        </label>
                    </div>
                    -->
                    <div class="field">
                        <label class="label">${i18n.t('book-list.books')}</label>
                        <div class="control">
                            <dbp-data-table-view
                                searching
                                paging
                                column-searching
                                default-order='[3, "desc"]'
                                exportable
                                export-name="${i18n.t('order-list.export-name', {
                                    organizationCode: this.getOrganizationCode(),
                                })}"
                                subscribe="lang:lang"
                                id="book-books-1"></dbp-data-table-view>
                        </div>
                    </div>
                </div>
                <div id="no-books-block">${i18n.t('book-list.no-books')}</div>
            </form>
            <div
                class="notification is-warning ${classMap({
                    hidden: this.isLoggedIn() || this.isLoading(),
                })}">
                ${i18n.t('error-login-message')}
                <a href="#" @click="${this._onLoginClicked}">${i18n.t('error-login-link')}</a>
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

commonUtils.defineCustomElement('dbp-sublibrary-order-list', LibraryOrderList);
