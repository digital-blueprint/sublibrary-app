import {i18n} from './i18n.js';
import {css, html} from 'lit-element';
import VPULibraryLitElement from "./vpu-library-lit-element";
import * as commonUtils from 'vpu-common/utils';
import * as commonStyles from 'vpu-common/styles';
import 'vpu-data-table-view';
import * as errorUtils from "vpu-common/error";

class LibraryBookList extends VPULibraryLitElement {
    constructor() {
        super();
        this.lang = 'de';
        this.entryPointUrl = commonUtils.getAPiUrl();
        this.personId = "";
        this.person = null;
        this.books = [];
        this.instituteId = '';
    }

    /**
     * See: https://lit-element.polymer-project.org/guide/properties#conversion-type
     */
    static get properties() {
        return {
            lang: { type: String },
            entryPointUrl: { type: String, attribute: 'entry-point-url' },
            instituteId: { type: String, attribute: 'institute-id' },
            books: { type: Object, attribute: false },
        };
    }

    connectedCallback() {
        super.connectedCallback();
        const that = this;

        this.updateComplete.then(()=>{
            // show user interface when logged in person object is available
            that.callInitUserInterface();

            this.loadTable();
        });
    }

    update(changedProperties) {
        changedProperties.forEach((oldValue, propName) => {
            if (propName === "lang") {
                i18n.changeLanguage(this.lang);

                // we need to update the column titles
                this.loadTable();
            } else if (propName === "instituteId") {
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

        if (this.instituteId === "") {
            return;
        }

        const apiUrl = this.entryPointUrl + this.instituteId + "/library-book-offers";
        const $booksLoadingIndicator = this.$('#books-loading');

        $booksLoadingIndicator.show();

        // load list of books for person
        fetch(apiUrl, {
            headers: {
                'Content-Type': 'application/ld+json',
                'Authorization': 'Bearer ' + window.VPUAuthToken,
            },
        })
            .then(result => {
                $booksLoadingIndicator.hide();
                if (!result.ok) throw result;
                return result.json();
            })
            .then(result => {
                that.books = result['hydra:member'];

                if (that.books.length > 0) {
                    const vdtv1 = that._('#book-books-1');
                    if (vdtv1 !== null) {
                        const columns = [
                            {title: i18n.t('book-list.book-title') },
                            {title: i18n.t('book-list.book-author') },
                            {title: i18n.t('book-list.book-barcode') },
                            {title: i18n.t('book-list.book-location') },
                            {title: i18n.t('book-list.book-location-identifier') },
                        ];
                        // const vdtv1_columnDefs = [
                        //     {targets: [2], visible: false},
                        //     {targets: [1], orderData: [2]},
                        //     {targets: [2, 3], searchable: false},
                        //     {targets: [3], sortable: false}
                        // ];
                        const tbl = [];
                        that.books.forEach(function(bookOffer) {
                            const row = [
                                bookOffer.book.title,
                                bookOffer.book.author,
                                bookOffer.barcode,
                                bookOffer.location,
                                bookOffer.locationIdentifier,
                            ];
                            tbl.push(row);
                        });
                        vdtv1.set_columns(columns)
                            // .set_columnDefs(vdtv1_columnDefs)
                            .set_datatable(tbl);
                    }
                    $bookListBlock.show();
                } else {
                    $noBooksBlock.show();
                }
            }).catch(error => errorUtils.handleFetchError(error, i18n.t('renew-book.error-load-books-summary')));
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

            #book-list-block, #permission-error-block, #no-books-block { display: none; }
            form, table {width: 100%}

            #no-books-block { font-weight: bold; }
        `;
    }

    render() {
        return html`
            <form class="hidden">
                <vpu-mini-spinner id="books-loading" style="font-size: 2em; display: none;"></vpu-mini-spinner>
                <div id="book-list-block" class="field">
                    <label class="label">${i18n.t('book-list.books')}</label>
                    <div class="control">
                        <vpu-data-table-view searching paging lang="${this.lang}" id="book-books-1" columns-count="5"></vpu-data-table-view>
                    </div>
                </div>
                <div id="no-books-block">
                    ${i18n.t('book-list.no-books')}
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

commonUtils.defineCustomElement('vpu-library-book-list', LibraryBookList);
