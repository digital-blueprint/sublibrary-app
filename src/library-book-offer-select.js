import $ from 'jquery';
import {findObjectInApiResults} from './utils.js';
import select2 from 'select2';
import select2LangDe from './i18n/de/select2-book-offer';
import select2LangEn from './i18n/en/select2-book-offer';
import {css, html} from 'lit';
import {ScopedElementsMixin} from '@dbp-toolkit/common';
import {createInstance} from './i18n.js';
import {Icon, combineURLs} from '@dbp-toolkit/common';
import * as commonUtils from '@dbp-toolkit/common/utils';
import * as commonStyles from '@dbp-toolkit/common/styles';
import select2CSSPath from 'select2/dist/css/select2.min.css';
import {AdapterLitElement} from '@dbp-toolkit/common';
import * as errorUtils from '@dbp-toolkit/common/error';

export class LibraryBookOfferSelect extends ScopedElementsMixin(AdapterLitElement) {
    constructor() {
        super();
        this._i18n = createInstance();
        this.lang = this._i18n.language;
        this.auth = {};
        this.entryPointUrl = '';
        this.$select = null;
        // For some reason using the same ID on the whole page twice breaks select2 (regardless if they are in different custom elements)
        this.selectId = 'book-offer-select-' + commonUtils.makeId(24);
        this.value = '';
        this.object = null;
        this.ignoreValueUpdate = false;
        this.lastResult = {};
        this.showReloadButton = false;
        this.reloadButtonTitle = '';
        this.sublibraryIri = '';

        Object.assign(LibraryBookOfferSelect.prototype, errorUtils.errorMixin);

        this._onDocumentClicked = this._onDocumentClicked.bind(this);

        select2(window, $);
    }

    static get scopedElements() {
        return {
            'dbp-icon': Icon,
        };
    }

    $(selector) {
        return $(this.shadowRoot.querySelector(selector));
    }

    static get properties() {
        return {
            ...super.properties,
            lang: {type: String},
            entryPointUrl: {type: String, attribute: 'entry-point-url'},
            value: {type: String},
            object: {type: Object, attribute: false},
            showReloadButton: {type: Boolean, attribute: 'show-reload-button'},
            reloadButtonTitle: {type: String, attribute: 'reload-button-title'},
            sublibraryIri: {type: String, attribute: 'sublibrary-iri'},
            auth: {type: Object},
        };
    }

    close() {
        this.$select.select2('close');
    }

    clear() {
        this.object = null;
        $(this).attr('data-object', '');
        $(this).data('object', null);
        this.$select.val(null).trigger('change').trigger('select2:unselect');
    }

    connectedCallback() {
        super.connectedCallback();
        document.addEventListener('click', this._onDocumentClicked);

        this.updateComplete.then(() => {
            this.$select = this.$('#' + this.selectId);
            this.$select.disabled = true;
            // try an init when user-interface is loaded
            if (!this.select2IsInitialized()) {
                this.initSelect2();
            }
        });
    }

    disconnectedCallback() {
        document.removeEventListener('click', this._onDocumentClicked);
        super.disconnectedCallback();
    }

    _onDocumentClicked(ev) {
        // Close the popup when clicking outside of select2
        if (!ev.composedPath().includes(this)) {
            const $select = this.$('#' + this.selectId);
            if ($select.length && this.select2IsInitialized()) {
                $select.select2('close');
            }
        }
    }

    isInt(value) {
        return (
            !isNaN(value) &&
            (function (x) {
                return (x | 0) === x;
            })(parseFloat(value))
        );
    }

    /**
     * Initializes the Select2 selector
     * @param {boolean} ignorePreset
     */
    initSelect2(ignorePreset = false) {
        const that = this;
        const $that = $(this);

        if (this.$select === null || this.entryPointUrl === null) {
            return false;
        }

        const apiUrl = combineURLs(this.entryPointUrl, '/sublibrary/book-offers');

        // we need to destroy Select2 and remove the event listeners before we can initialize it again
        if (this.$select.hasClass('select2-hidden-accessible')) {
            this.$select.select2('destroy');
            this.$select.off('select2:select');
            this.$select.off('select2:unselect');
        }

        this.$select
            .select2({
                width: '100%',
                language: this.lang === 'de' ? select2LangDe() : select2LangEn(),
                minimumInputLength: 3,
                allowClear: true,
                placeholder: this._i18n.t('library-book-offer-select.placeholder'),
                dropdownParent: this.$('#library-book-offer-select-dropdown'),
                ajax: {
                    delay: 250,
                    url: apiUrl,
                    contentType: 'application/ld+json',
                    beforeSend: function (jqXHR) {
                        // console.log("this.auth", that.auth);
                        jqXHR.setRequestHeader('Authorization', 'Bearer ' + that.auth.token);
                    },
                    data: function (params) {
                        let barcode = params.term.trim();

                        // add a "+" if the barcode is missing it
                        // first check if barcode is not a pure integer or starts with a "@"
                        if (
                            !that.isInt(barcode) &&
                            barcode.substr(0, 1) !== '+' &&
                            barcode.substr(0, 1) !== '@'
                        ) {
                            barcode = '+' + barcode;
                        }
                        let sublibraryId = that.sublibraryIri.split('/').slice(-1)[0];
                        return {
                            barcode: barcode,
                            sublibrary: sublibraryId,
                        };
                    },
                    processResults: function (data) {
                        that.$('#library-book-offer-select-dropdown').addClass('select2-bug');
                        that.lastResult = data;

                        let results = [];
                        data['hydra:member'].forEach((item) => {
                            results.push({
                                id: item['@id'],
                                text: item['name'],
                            });
                        });
                        return {
                            results: results,
                        };
                    },
                    error: (jqXHR, textStatus, errorThrown) => {
                        that.handleXhrError(jqXHR, textStatus, errorThrown);
                    },
                },
            })
            .on('select2:select', function (e) {
                that.$('#library-book-offer-select-dropdown').removeClass('select2-bug');
                const identifier = e.params.data.id;
                that.object = findObjectInApiResults(identifier, that.lastResult);

                if (that.object === undefined) {
                    return;
                }

                // set custom element attributes
                $that.attr('data-object', JSON.stringify(that.object));
                $that.data('object', that.object);

                if ($that.attr('value') !== identifier) {
                    that.ignoreValueUpdate = true;
                    $that.attr('value', identifier);
                    that.value = identifier;

                    // fire a change event
                    that.dispatchEvent(
                        new CustomEvent('change', {
                            detail: {
                                value: identifier,
                            },
                        }),
                    );
                }
            })
            .on('select2:unselect', function (e) {
                that.object = null;
                $that.attr('data-object', '');
                $that.data('object', {});
                that.ignoreValueUpdate = true;
                $that.attr('value', '');
                that.value = '';

                // fire a unselect event
                that.dispatchEvent(new CustomEvent('unselect'));
            });

        // preset a book offer
        if (!ignorePreset && this.value !== '' && this.value !== 'null') {
            const apiUrl = this.entryPointUrl + this.value;

            fetch(apiUrl, {
                headers: {
                    'Content-Type': 'application/ld+json',
                    Authorization: 'Bearer ' + that.auth.token,
                },
            })
                .then((result) => {
                    if (!result.ok) throw result;
                    return result.json();
                })
                .then((bookOffer) => {
                    that.object = bookOffer;
                    const identifier = bookOffer['@id'];
                    const option = new Option(bookOffer.name, identifier, true, true);
                    $that.attr('data-object', JSON.stringify(bookOffer));
                    $that.data('object', bookOffer);
                    that.$select.val(null).append(option).trigger('change');

                    // fire a change event
                    that.dispatchEvent(
                        new CustomEvent('change', {
                            detail: {
                                value: identifier,
                            },
                            bubbles: true,
                        }),
                    );
                })
                .catch(() => {
                    that.clear();
                });
        }

        return true;
    }

    update(changedProperties) {
        changedProperties.forEach((oldValue, propName) => {
            switch (propName) {
                case 'lang':
                    this._i18n.changeLanguage(this.lang);

                    if (this.select2IsInitialized()) {
                        // no other way to set an other language at runtime did work
                        this.initSelect2(true);
                    }
                    break;
                case 'sublibraryIri':
                    if (!this.sublibraryIri) {
                        this.sublibraryIri = '';
                    }
                    if (this.$select) {
                        this.$select.enable = this.sublibraryIri.includes('-');
                    }
                    break;
                case 'value':
                    if (!this.ignoreValueUpdate && this.select2IsInitialized()) {
                        this.initSelect2();
                    }

                    this.ignoreValueUpdate = false;
                    break;
                case 'entryPointUrl':
                    // we don't need to preset the selector if the entry point url changes
                    this.initSelect2(true);
                    break;
                case 'auth':
                    if (this.auth.token && (!oldValue || !oldValue.token)) {
                        this.initSelect2();
                    }
                    break;
            }
        });

        super.update(changedProperties);
    }

    select2IsInitialized() {
        return this.$select !== null && this.$select.hasClass('select2-hidden-accessible');
    }

    reloadClick() {
        if (this.object === null) {
            return;
        }

        // fire a change event
        this.dispatchEvent(
            new CustomEvent('change', {
                detail: {
                    value: this.value,
                },
                bubbles: true,
            }),
        );
    }

    static get styles() {
        // language=css
        return css`
            ${commonStyles.getThemeCSS()}
            ${commonStyles.getGeneralCSS()}
            ${commonStyles.getButtonCSS()}
            ${commonStyles.getFormAddonsCSS()}
            ${commonStyles.getSelect2CSS()}

            .select2-control.control {
                width: 100%;
            }

            .select select {
                height: 2em;
            }

            .field .button.control {
                display: flex;
                align-items: center;
                justify-content: center;
                border: 1px solid var(--dbp-override-muted);
                -moz-border-radius-topright: var(--dbp-border-radius);
                -moz-border-radius-bottomright: var(--dbp-border-radius);
                line-height: 100%;
            }

            .field:not(:last-child) {
                margin-bottom: 0;
            }

            .field .button.control dbp-icon {
                top: 0;
            }

            /* https://github.com/select2/select2/issues/5457 */
            .select2-bug .loading-results {
                display: none !important;
            }
        `;
    }

    render() {
        const select2CSS = commonUtils.getAssetURL(select2CSSPath);

        return html`
            <link rel="stylesheet" href="${select2CSS}" />
            <style>
                #${this.selectId} {
                    width: 100%;
                }
                li.select2-selection__choice {
                    white-space: normal;
                }
            </style>

            <div class="select">
                <div class="field has-addons">
                    <div class="select2-control control">
                        <!-- https://select2.org-->
                        <select id="${this.selectId}" name="book-offer" class="select"></select>
                    </div>
                    <a
                        class="control button"
                        id="reload-button"
                        ?disabled=${this.object === null}
                        @click="${this.reloadClick}"
                        style="display: ${this.showReloadButton ? 'flex' : 'none'}"
                        title="${this.reloadButtonTitle}">
                        <dbp-icon name="reload"></dbp-icon>
                    </a>
                </div>
                <div id="library-book-offer-select-dropdown"></div>
            </div>
        `;
    }
}
