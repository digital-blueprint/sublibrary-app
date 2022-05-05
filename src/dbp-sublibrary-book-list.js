import {createInstance} from './i18n.js';
import {css, html} from 'lit';
import {ScopedElementsMixin} from '@open-wc/scoped-elements';
import {LibraryElement} from './library-element.js';
import * as commonUtils from '@dbp-toolkit/common/utils';
import * as commonStyles from '@dbp-toolkit/common/styles';
import {DataTableView} from '@dbp-toolkit/data-table-view';
import {MiniSpinner} from '@dbp-toolkit/common';
import select2 from 'select2';
import select2LangDe from './i18n/de/select2';
import select2LangEn from './i18n/en/select2';
import select2CSSPath from 'select2/dist/css/select2.min.css';
import $ from 'jquery';
import {classMap} from 'lit/directives/class-map.js';
import {LibrarySelect} from './library-select.js';

select2(window, $);

class LibraryBookList extends ScopedElementsMixin(LibraryElement) {
    constructor() {
        super();
        this._i18n = createInstance();
        this.auth = {};
        this.lang = this._i18n.language;
        this.entryPointUrl = '';
        this.personId = '';
        this.person = null;
        this.books = [];
        this.sublibraryIri = '';
        this.abortController = null;
        this.locationIdentifier = '';
        this.locationIdentifiers = [];
        this.locationIdentifierSelectId =
            'dbp-sublibrary-book-list-location-identifier-select-' + commonUtils.makeId(24);
        this.$locationIdentifierSelect = null;
        this.inventoryYear = '';
        this.inventoryYears = [];
        this.inventoryYearSelectId =
            'dbp-sublibrary-book-list-inventory-year-select-' + commonUtils.makeId(24);
        this.$inventoryYearSelect = null;

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
            locationIdentifiers: {type: Array, attribute: false},
            locationIdentifier: {type: String, attribute: false},
            inventoryYears: {type: Array, attribute: false},
            inventoryYear: {type: String, attribute: false},
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
            this.initLocationIdentifierSelect();
            this.initInventoryYearSelect();

            // language=css
            const css = `
                table.dataTable tbody tr.odd {
                    background-color: var(--dbp-background);
                }
            `;

            this._(this.getScopedTagName('dbp-data-table-view')).setCSSStyle(css);
            this.loadTable();
        });
    }

    update(changedProperties) {
        changedProperties.forEach((oldValue, propName) => {
            switch (propName) {
                case 'lang':
                    this._i18n.changeLanguage(this.lang);
                    this.updateLocationIdentifierSelect();

                    // we need to update the column titles
                    this.buildTable(false);
                    break;
                case 'sublibraryIri':
                    this.loadTable();
                    break;
                case 'locationIdentifiers':
                    this.updateLocationIdentifierSelect();
                    break;
                case 'locationIdentifier':
                case 'inventoryYear':
                    this.buildTable(false);
                    break;
                case 'inventoryYears':
                    this.updateInventoryYearSelect();
                    break;
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

    updateInventoryYearSelect() {
        this.initInventoryYearSelect();
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

        if (!this.isLoggedIn()) return;

        if (this.sublibraryIri === '') {
            return;
        }

        const parts = this.sublibraryIri.split('/');
        const sublibraryIdentifier = parts[parts.length - 1];

        const apiUrl = this.entryPointUrl + '/sublibrary/book-offers?perPage=9999999&sublibrary=' + sublibraryIdentifier;
        const $booksLoadingIndicator = that.$('#books-loading');

        $booksLoadingIndicator.show();

        // abort previous list fetch if it is still running
        if (this.abortController !== null) {
            this.abortController.abort();
        }

        this.abortController = new AbortController();
        const signal = this.abortController.signal;

        // load list of books for organization
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
                that.buildTable();
                $booksLoadingIndicator.hide();
            })
            .catch((error) => {
                that.handleFetchError(error, that._i18n.t('book-list.error-load-books'));
                if(this.abortController === null)
                    $booksLoadingIndicator.hide();
            });
    }

    buildTable(updateFilterSelects = true) {
        const that = this;
        const $bookListBlock = this.$('#book-list-block');
        const $noBooksBlock = this.$('#no-books-block');
        let locationIdentifiers = [];
        let inventoryYears = [];

        if (this.books.length > 0) {
            const vdtv1 = this._('#book-books-1');
            if (vdtv1 !== null) {
                const columns = [
                    {title: this._i18n.t('book-list.book-title')},
                    {title: this._i18n.t('book-list.book-author')},
                    {title: this._i18n.t('book-list.book-publication-year')},
                    {title: this._i18n.t('book-list.book-publisher')},
                    {title: this._i18n.t('book-list.book-availability-date')},
                    null,
                    {title: this._i18n.t('book-list.book-barcode')},
                    {title: this._i18n.t('book-list.book-location-identifier')},
                    {title: this._i18n.t('book-list.book-description')},
                ];

                // sorting will be done by hidden columns
                const columnDefs = [
                    {targets: [4], orderData: [5]},
                    {targets: [5], visible: false},
                ];

                const tbl = [];
                this.books.forEach(function (bookOffer) {
                    const availabilityStarts = new Date(bookOffer.availabilityStarts);
                    const inventoryYear =
                        bookOffer.availabilityStarts !== null
                            ? availabilityStarts.getFullYear().toString()
                            : '';

                    if (
                        (that.locationIdentifier === '' ||
                            that.locationIdentifier === bookOffer.locationIdentifier) &&
                        (that.inventoryYear === '' || that.inventoryYear === inventoryYear)
                    ) {
                        const datePublished = new Date(bookOffer.book.datePublished);

                        const row = [
                            bookOffer.book.title,
                            bookOffer.book.author,
                            bookOffer.book.datePublished !== null
                                ? datePublished.getFullYear()
                                : '',
                            bookOffer.book.publisher,
                            bookOffer.availabilityStarts !== null
                                ? availabilityStarts.toLocaleDateString('de-AT')
                                : '',
                            bookOffer.availabilityStarts,
                            bookOffer.barcode,
                            bookOffer.locationIdentifier,
                            bookOffer.description,
                        ];

                        tbl.push(row);
                    }

                    if (updateFilterSelects) {
                        if (
                            bookOffer.locationIdentifier !== '' &&
                            !locationIdentifiers.includes(bookOffer.locationIdentifier)
                        ) {
                            locationIdentifiers.push(bookOffer.locationIdentifier);
                        }
                        if (inventoryYear !== '' && !inventoryYears.includes(inventoryYear)) {
                            inventoryYears.push(inventoryYear);
                        }
                    }
                });
                vdtv1.set_columns(columns).set_columnDefs(columnDefs).set_datatable(tbl);
            }
            $bookListBlock.show();
        } else {
            $noBooksBlock.show();
        }

        if (updateFilterSelects) {
            this.locationIdentifiers = locationIdentifiers.sort();
            this.locationIdentifier = '';

            if (this.$locationIdentifierSelect !== null) {
                this.$locationIdentifierSelect.val('');
            }

            this.inventoryYears = inventoryYears.sort().reverse();
            this.inventoryYear = '';

            if (this.$inventoryYearSelect !== null) {
                this.$inventoryYearSelect.val('');
            }
        }
    }

    onLanguageChanged(e) {
        this.lang = e.detail.lang;
    }

    locationIdentifierSelect2IsInitialized() {
        return (
            this.$locationIdentifierSelect !== null &&
            this.$locationIdentifierSelect.hasClass('select2-hidden-accessible')
        );
    }

    /**
     * Initializes the locationIdentifier Select2 selector
     */
    initLocationIdentifierSelect() {
        let that = this;
        this.$locationIdentifierSelect = this.$('#' + this.locationIdentifierSelectId);

        // destroy previous instance of Select2
        if (this.locationIdentifierSelect2IsInitialized()) {
            this.$locationIdentifierSelect.select2('destroy');
        }

        this.$locationIdentifierSelect
            .select2({
                width: '100%',
                allowClear: true,
                language: this.lang === 'de' ? select2LangDe() : select2LangEn(),
                placeholder: this._i18n.t('book-list.location-identifier-select-placeholder'),
                dropdownParent: this.$('#location-identifier-select-dropdown'),
            })
            .on('select2:select', function (e) {
                that.locationIdentifier = e.params.data.id;
            })
            .on('select2:clear', function () {
                that.locationIdentifier = '';
            })
            .on('select2:open', function () {
                // close the selector when clicked outside of it
                that.$('#location-identifier-select-dropdown .select2-search__field').blur(() => {
                    // the delay is a workaround to prevent troubles
                    setTimeout(() => {
                        that.$locationIdentifierSelect.select2('close');
                    }, 250);
                });
                //
            });
    }

    inventoryYearSelect2IsInitialized() {
        return (
            this.$inventoryYearSelect !== null &&
            this.$inventoryYearSelect.hasClass('select2-hidden-accessible')
        );
    }

    /**
     * Initializes the inventory year Select2 selector
     */
    initInventoryYearSelect() {
        let that = this;
        this.$inventoryYearSelect = this.$('#' + this.inventoryYearSelectId);

        // destroy previous instance of Select2
        if (this.inventoryYearSelect2IsInitialized()) {
            this.$inventoryYearSelect.select2('destroy');
        }

        this.$inventoryYearSelect
            .select2({
                width: '100%',
                allowClear: true,
                language: this.lang === 'de' ? select2LangDe() : select2LangEn(),
                placeholder: this._i18n.t('book-list.inventory-year-select-placeholder'),
                dropdownParent: this.$('#inventory-year-select-dropdown'),
            })
            .on('select2:select', function (e) {
                that.inventoryYear = e.params.data.id;
            })
            .on('select2:clear', function () {
                that.inventoryYear = '';
            })
            .on('select2:open', function () {
                // close the selector when clicked outside of it
                that.$('#inventory-year-select-dropdown .select2-search__field').blur(() => {
                    // the delay is a workaround to prevent troubles
                    setTimeout(() => {
                        that.$inventoryYearSelect.select2('close');
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
            ${commonStyles.getSelect2CSS()}

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

    render() {
        let locationIdentifierItemTemplates = [];
        this.locationIdentifiers.forEach((item) => {
            locationIdentifierItemTemplates.push(html`<option value="${item}">${item}</option>`);
        });

        let inventoryYearItemTemplates = [];
        this.inventoryYears.forEach((item) => {
            inventoryYearItemTemplates.push(html`<option value="${item}">${item}</option>`);
        });

        const select2CSS = commonUtils.getAssetURL(select2CSSPath);
        const i18n = this._i18n;
        return html`
            <link rel="stylesheet" href="${select2CSS}" />
            <form
                class="${classMap({
                    hidden: !this.isLoggedIn() || !this.hasLibraryPermissions() || this.isLoading(),
                })}">
                <div class="field">
                    ${i18n.t('book-list.current-state')}: ${this.analyticsUpdateDate}
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
                    text="${i18n.t('book-list.mini-spinner-text')}"
                    style="font-size: 2em; display: none;"></dbp-mini-spinner>
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
                        <label class="label">${i18n.t('book-list.book-inventory-year')}</label>
                        <div class="control">
                            <select id="${this.inventoryYearSelectId}">
                                <option value=""></option>
                                ${inventoryYearItemTemplates}
                            </select>
                            <div id="inventory-year-select-dropdown"></div>
                        </div>
                    </div>
                    <div class="field">
                        <label class="label">${i18n.t('book-list.books')}</label>
                        <div class="control">
                            <dbp-data-table-view
                                searching
                                paging
                                exportable
                                export-name="${i18n.t('book-list.export-name', {
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

commonUtils.defineCustomElement('dbp-sublibrary-book-list', LibraryBookList);
