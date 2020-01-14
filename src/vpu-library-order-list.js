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

class LibraryOrderList extends VPULibraryLitElement {
    constructor() {
        super();
        this.lang = i18n.language;
        this.entryPointUrl = commonUtils.getAPiUrl();
        this.personId = "";
        this.person = null;
        this.books = [];
        this.organizationId = '';
        this.abortController = null;
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

            this._("vpu-data-table-view").setCSSStyle(css);
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
                            {title: i18n.t('order-list.receiving -note')},
                        ];

                        // sorting will be done by hidden columns
                        const columnDefs = [
                            {targets: [3], orderData: [4]},
                            {targets: [4], visible: false},
                        ];

                        const tbl = [];
                        that.books.forEach(function(bookOrder) {
                            const orderDate = new Date(bookOrder.orderDate);

                            const row = [
                                bookOrder.orderedItem.orderedItem.title,
                                bookOrder.orderedItem.orderedItem.author,
                                bookOrder.orderedItem.orderedItem.isbn,
                                orderDate.toLocaleDateString("de-AT"),
                                bookOrder.orderDate,
                                bookOrder.orderNumber,
                                bookOrder.receivingNote,
                            ];
                            tbl.push(row);
                        });
                        vdtv1.set_columns(columns)
                            .set_columnDefs(columnDefs)
                            .set_datatable(tbl);
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

    render() {

        const dateStringYesterday = () => {
            const now = new Date();
            now.setDate(now.getDate() - 1);
            return now.toLocaleDateString(this.lang);
        };

        return html`
            <form class="${classMap({hidden: !this.isLoggedIn() || !this.hasLibraryPermissions()})}">
                <div class="field">
                    ${i18n.t('order-list.current-state')}: ${dateStringYesterday()}
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
                        <vpu-data-table-view searching paging exportable export-name="${i18n.t('order-list.export-name', {organizationCode: this.getOrganizationCode()})}"
                                             lang="${this.lang}" id="book-books-1"></vpu-data-table-view>
                    </div>
                </div>
                <div id="no-books-block">
                    ${i18n.t('book-list.no-books')}
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

commonUtils.defineCustomElement('vpu-library-order-list', LibraryOrderList);
