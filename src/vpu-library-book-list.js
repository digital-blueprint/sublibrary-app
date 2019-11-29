import {i18n} from './i18n.js';
import {css, html} from 'lit-element';
import VPULibraryLitElement from "./vpu-library-lit-element";
import * as commonUtils from 'vpu-common/utils';
import * as commonStyles from 'vpu-common/styles';
import 'vpu-data-table-view';
import * as errorUtils from "vpu-common/error";
import select2 from 'select2';
import select2LangDe from './i18n/de/select2'
import select2LangEn from './i18n/en/select2'
import select2CSSPath from 'select2/dist/css/select2.min.css';
import $ from "jquery";

select2(window, $);

class LibraryBookList extends VPULibraryLitElement {
    constructor() {
        super();
        this.lang = 'de';
        this.entryPointUrl = commonUtils.getAPiUrl();
        this.personId = "";
        this.person = null;
        this.books = [];
        this.organizationId = '';
        this.abortController = null;
        this.locationIdentifier = '';
        this.locationIdentifiers = [];
        this.locationIdentifierSelectId = 'vpu-library-book-list-location-identifier-select-' + commonUtils.makeId(24);
        this.$locationIdentifierSelect = null;
    }

    /**
     * See: https://lit-element.polymer-project.org/guide/properties#conversion-type
     */
    static get properties() {
        return {
            lang: { type: String },
            entryPointUrl: { type: String, attribute: 'entry-point-url' },
            organizationId: { type: String, attribute: 'organization-id' },
            books: { type: Object, attribute: false },
            locationIdentifiers: { type: Array, attribute: false },
            locationIdentifier: { type: String, attribute: false },
        };
    }

    connectedCallback() {
        super.connectedCallback();

        this.updateComplete.then(()=>{
            this.initLocationIdentifierSelect();

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
            if (propName === "lang") {
                i18n.changeLanguage(this.lang);
                this.updateLocationIdentifierSelect();

                // we need to update the column titles
                this.buildTable(false);
            } else if (propName === "organizationId") {
                this.loadTable();
            } else if (propName === "locationIdentifiers") {
                this.updateLocationIdentifierSelect();
            } else if (propName === "locationIdentifier") {
                this.buildTable(false);
            }
        });

        super.update(changedProperties);
    }

    updateLocationIdentifierSelect() {
        this.initLocationIdentifierSelect();

        // if (this.$locationIdentifierSelect !== null) {
        //     this.$locationIdentifierSelect.trigger('change.select2');
        // }
    }

    loadTable() {
        const that = this;
        const $bookListBlock = that.$('#book-list-block');
        const $noBooksBlock = that.$('#no-books-block');
        $bookListBlock.hide();
        $noBooksBlock.hide();

        if (this.organizationId === "") {
            return;
        }

        const apiUrl = this.entryPointUrl + this.organizationId + "/library-book-offers";
        const $booksLoadingIndicator = this.$('#books-loading');

        $booksLoadingIndicator.show();

        // abort previous list fetch if it is still running
        if (this.abortController !== null) {
            this.abortController.abort();
        }

        this.abortController = new AbortController();
        const signal = this.abortController.signal;

        // load list of books for person
        fetch(apiUrl, {
            headers: {
                'Content-Type': 'application/ld+json',
                'Authorization': 'Bearer ' + window.VPUAuthToken,
            },
            signal: signal,
        })
            .then(result => {
                $booksLoadingIndicator.hide();
                if (!result.ok) throw result;
                return result.json();
            })
            .then(result => {
                that.books = result['hydra:member'];
                that.buildTable();
            }).catch(error => errorUtils.handleFetchError(error, i18n.t('renew-book.error-load-books-summary')));
    }

    buildTable(updateLocationIdentifiers = true) {
        const that = this;
        const $bookListBlock = this.$('#book-list-block');
        const $noBooksBlock = this.$('#no-books-block');
        let locationIdentifiers = [];

        if (this.books.length > 0) {
            const vdtv1 = this._('#book-books-1');
            if (vdtv1 !== null) {
                const columns = [
                    {title: i18n.t('book-list.book-title')},
                    {title: i18n.t('book-list.book-author')},
                    {title: i18n.t('book-list.book-barcode')},
                    {title: i18n.t('book-list.book-location')},
                    {title: i18n.t('book-list.book-location-identifier')},
                ];
                // const vdtv1_columnDefs = [
                //     {targets: [2], visible: false},
                //     {targets: [1], orderData: [2]},
                //     {targets: [2, 3], searchable: false},
                //     {targets: [3], sortable: false}
                // ];
                const tbl = [];
                this.books.forEach(function (bookOffer) {
                    if (that.locationIdentifier === "" ||
                        that.locationIdentifier === bookOffer.locationIdentifier) {
                        const row = [
                            bookOffer.book.title,
                            bookOffer.book.author,
                            bookOffer.barcode,
                            bookOffer.location,
                            bookOffer.locationIdentifier,
                        ];

                        tbl.push(row);
                    }

                    if (updateLocationIdentifiers &&
                        bookOffer.locationIdentifier !== "" &&
                        !locationIdentifiers.includes(bookOffer.locationIdentifier)) {
                        locationIdentifiers.push(bookOffer.locationIdentifier);
                    }
                });
                vdtv1.set_columns(columns)
                // .set_columnDefs(vdtv1_columnDefs)
                    .set_datatable(tbl);
            }
            $bookListBlock.show();
        } else {
            $noBooksBlock.show();
        }

        if (updateLocationIdentifiers) {
            this.locationIdentifiers = locationIdentifiers.sort();
            this.locationIdentifier = "";

            if (this.$locationIdentifierSelect !== null) {
                this.$locationIdentifierSelect.val("");
            }
        }
    }

    onLanguageChanged(e) {
        this.lang = e.detail.lang;
    }

    locationIdentifierSelect2IsInitialized() {
        return this.$locationIdentifierSelect !== null && this.$locationIdentifierSelect.hasClass("select2-hidden-accessible");
    }

    /**
     * Initializes the locationIdentifier Select2 selector
     */
    initLocationIdentifierSelect() {
        let that = this;
        this.$locationIdentifierSelect = this.$('#' + this.locationIdentifierSelectId);

        // destroy previous instance of Select2
        if (this.locationIdentifierSelect2IsInitialized()) {
            this.$locationIdentifierSelect.select2("destroy");
        }

        this.$locationIdentifierSelect.select2({
            width: '100%',
            allowClear: true,
            language: this.lang === "de" ? select2LangDe() : select2LangEn(),
            placeholder: i18n.t('book-list.location-identifier-select-placeholder'),
            dropdownParent: this.$('#location-identifier-select-dropdown'),
        }).on("select2:select", function (e) {
            that.locationIdentifier = e.params.data.id;
        }).on("select2:clear", function () {
            that.locationIdentifier = "";
        }).on("select2:open", function () {
            // close the selector when clicked outside of it
            that.$("#location-identifier-select-dropdown .select2-search__field").blur(() => {
                // the delay is a workaround to prevent troubles
                setTimeout(() => {
                    that.$locationIdentifierSelect.select2('close');
                }, 250);
            });
            //
        });
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
        let locationIdentifierItemTemplates = [];
        this.locationIdentifiers.forEach((item) => {
            locationIdentifierItemTemplates.push(html`<option value="${item}">${item}</option>`);
        });

        commonUtils.initAssetBaseURL('vpu-library-book-list-src');
        const select2CSS = commonUtils.getAssetURL(select2CSSPath);
        return html`
            <link rel="stylesheet" href="${select2CSS}">
            <form class="hidden">
                <vpu-mini-spinner id="books-loading" style="font-size: 2em; display: none;"></vpu-mini-spinner>
                <div id="book-list-block">
                    <div class="field">
                        <label class="label">${i18n.t('book-list.book-location-identifier')}</label>
                        <div class="control">
                            <select id="${this.locationIdentifierSelectId}">
                                <option value=""></option>
                                ${locationIdentifierItemTemplates}
                            </select>
                            <div id="location-identifier-select-dropdown"></div>
                        </div>
                    </div>
                    <div class="field">
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
