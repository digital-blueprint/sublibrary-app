import {createI18nInstance} from './i18n.js';
import {numberFormat} from 'vpu-common/i18next.js';
import {css, html} from 'lit-element';
import {ScopedElementsMixin} from '@open-wc/scoped-elements';
import {LibraryElement} from "./library-element.js";
import * as commonUtils from 'vpu-common/utils';
import * as commonStyles from 'vpu-common/styles';
import {DataTableView} from 'vpu-data-table-view';
import * as errorUtils from "vpu-common/error";
import {OrganizationSelect} from './organization-select.js';
import {MiniSpinner} from 'vpu-common';
import {classMap} from 'lit-html/directives/class-map.js';
import $ from "jquery";

const i18n = createI18nInstance();


/**
 * Returns a translated label for the given status
 *
 * @param {string} status
 * @returns {string} A status label for the actve language
 */
function getEventStatusName(status) {
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
        this.lang = i18n.language;
        this.entryPointUrl = commonUtils.getAPiUrl();
        this.personId = "";
        this.person = null;
        this.books = [];
        this.organizationId = '';
        this.abortController = null;

        let now = new Date();
        now.setDate(now.getDate() - 1);
        this.analyticsUpdateDate = now.toLocaleDateString(this.lang);
    }

    static get scopedElements() {
        return {
            'vpu-knowledge-base-organization-select': OrganizationSelect,
            'vpu-data-table-view': DataTableView,
            'vpu-mini-spinner': MiniSpinner,
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
            books: { type: Object, attribute: false },
            analyticsUpdateDate: { type: Object, attribute: false },
        };
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

            this._(this.getScopedTagName("vpu-data-table-view")).setCSSStyle(css);
            this.loadTable();
        });
    }

    update(changedProperties) {
        changedProperties.forEach((oldValue, propName) => {
            if (propName === "lang") {
                i18n.changeLanguage(this.lang);

                // we need to update the column titles
                this.loadTable();
            } else if (propName === "organizationId") {
                this.loadTable();
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
        const $bookListBlock = that.$('#book-list-block');
        const $noBooksBlock = that.$('#no-books-block');
        $bookListBlock.hide();
        $noBooksBlock.hide();

        if (!this.isLoggedIn())
            return;

        if (this.organizationId === "") {
            return;
        }

        const apiUrl = this.entryPointUrl + this.organizationId + "/library-book-orders";
        const $booksLoadingIndicator = this.$('#books-loading');

        $booksLoadingIndicator.show();

        // abort previous list fetch if it is still running
        if (this.abortController !== null) {
            this.abortController.abort();
        }

        this.abortController = new AbortController();
        const signal = this.abortController.signal;

        console.assert(window.VPUAuthToken);
        // load list of books for person
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
                        that.books.forEach(function(bookOrder) {
                            const orderDate = new Date(bookOrder.orderDate);
                            let priceString = bookOrder.orderedItem.price > 0 ?
                                numberFormat(i18n, bookOrder.orderedItem.price) + " " + bookOrder.orderedItem.priceCurrency :
                                "";

                            const row = [
                                bookOrder.orderedItem.orderedItem.title,
                                bookOrder.orderedItem.orderedItem.author,
                                bookOrder.orderedItem.orderedItem.isbn,
                                orderDate.toLocaleDateString("de-AT"),
                                bookOrder.orderDate,
                                bookOrder.orderNumber,
                                priceString,
                                bookOrder.orderedItem.price,
                                getEventStatusName(bookOrder.orderedItem.orderDelivery.deliveryStatus.eventStatus.name),
                                bookOrder.receivingNote,
                            ];
                            tbl.push(row);
                        });
                        vdtv1.set_columns(columns)
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
            }).catch(error => {
                errorUtils.handleFetchError(error, i18n.t('order-list.error-load-orders'));
                $booksLoadingIndicator.hide();
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

            #book-list-block, #no-books-block { display: none; }
            form, table {width: 100%}

            #no-books-block { font-weight: bold; }
        `;
    }

    onOrgUnitCodeChanged(e) {
        this.organizationId = e.detail.value;
    }

    table_draw() {
        const table = this.shadowRoot.querySelector('#book-books-1');
        const value = table.columnReduce(7, function (a, b) {
            let a1 = 0;
            if (typeof a === 'string') { a1 = a.replace(',', '.').replace(' EUR', '') * 1; } else { a1 = a * 1; }
            let b1 = 0;
            if (typeof b === 'string') { b1 = b.replace(',', '.').replace(' EUR', '') * 1; } else { b1 = b * 1; }
            return a1 + b1;
        });
        this.shadowRoot.querySelector('#sum').value = value.toFixed(2).replace('.', ',') + ' EUR';
    }

    render() {
        return html`
            <form class="${classMap({hidden: !this.isLoggedIn() || !this.hasLibraryPermissions() || this.isLoading()})}">
                <div class="field">
                    ${i18n.t('order-list.current-state')}: ${this.analyticsUpdateDate}
                </div>
                <div class="field">
                    <label class="label">${i18n.t('organization-select.label')}</label>
                    <div class="control">
                        <vpu-knowledge-base-organization-select lang="${this.lang}"
                                                                value="${this.organizationId}"
                                                                @change="${this.onOrgUnitCodeChanged}"></vpu-knowledge-base-organization-select>
                    </div>
                </div>
                <vpu-mini-spinner id="books-loading" text="${i18n.t('order-list.mini-spinner-text')}" style="font-size: 2em; display: none;"></vpu-mini-spinner>
                <div id="book-list-block" class="field">
                    <label class="label">${i18n.t('book-list.books')}</label>
                    <div class="control">
                        <vpu-data-table-view searching paging column-searching 
                                exportable export-name="${i18n.t('order-list.export-name', {organizationCode: this.getOrganizationCode()})}"
                                lang="${this.lang}" id="book-books-1"></vpu-data-table-view>
                        <div>
                            <label for="sum">${i18n.t('order-list.sum-of-column')} <b>${i18n.t('order-list.book-price')}</b></label>
                            <input type="text" id="sum" value="0">
                        </div>
                    </div>
                </div>
                <div id="no-books-block">
                    ${i18n.t('book-list.no-books')}
                </div>
            </form>
            <div class="notification is-warning ${classMap({hidden: this.isLoggedIn() || this.isLoading()})}">
                ${i18n.t('error-login-message')}
            </div>
            <div class="notification is-danger ${classMap({hidden: this.hasLibraryPermissions() || !this.isLoggedIn() || this.isLoading()})}">
                ${i18n.t('error-permission-message')}
            </div>
            <div class="${classMap({hidden: !this.isLoading()})}">
                <vpu-mini-spinner></vpu-mini-spinner>
            </div>
        `;
    }
}

commonUtils.defineCustomElement('vpu-library-order-list', LibraryOrderList);
