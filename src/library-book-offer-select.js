import $ from 'jquery';
import {findObjectInApiResults} from './utils.js';
import select2 from 'select2';
import select2LangDe from './i18n/de/select2-book-offer';
import select2LangEn from './i18n/en/select2-book-offer';
import JSONLD from '@dbp-toolkit/common/jsonld';
import {css, html} from 'lit-element';
import {ScopedElementsMixin} from '@open-wc/scoped-elements';
import {createI18nInstance} from './i18n.js';
import {Icon} from "@dbp-toolkit/common";
import * as commonUtils from "@dbp-toolkit/common/utils";
import * as commonStyles from '@dbp-toolkit/common/styles';
import select2CSSPath from 'select2/dist/css/select2.min.css';
import {AdapterLitElement} from "@dbp-toolkit/provider/src/adapter-lit-element";


select2(window, $);

const i18n = createI18nInstance();

export class LibraryBookOfferSelect extends ScopedElementsMixin(AdapterLitElement) {

    constructor() {
        super();
        this.lang = 'de';
        this.auth = {};
        this.entryPointUrl = '';
        this.jsonld = null;
        this.$select = null;
        // For some reason using the same ID on the whole page twice breaks select2 (regardless if they are in different custom elements)
        this.selectId = 'book-offer-select-' + commonUtils.makeId(24);
        this.value = '';
        this.object = null;
        this.ignoreValueUpdate = false;
        this.lastResult = {};
        this.showReloadButton = false;
        this.reloadButtonTitle = '';
        this.organizationId = '';

        this._onDocumentClicked = this._onDocumentClicked.bind(this);
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
            lang: { type: String },
            entryPointUrl: { type: String, attribute: 'entry-point-url' },
            value: { type: String },
            object: { type: Object, attribute: false },
            showReloadButton: { type: Boolean, attribute: 'show-reload-button' },
            reloadButtonTitle: { type: String, attribute: 'reload-button-title' },
            organizationId: { type: String, attribute: 'organization-id' },
            auth: { type: Object },
        };
    }

    close() {
        this.$select.select2('close');
    }

    clear() {
        this.object = null;
        $(this).attr("data-object", "");
        $(this).data("object", null);
        this.$select.val(null).trigger('change').trigger('select2:unselect');
    }

    connectedCallback() {
        super.connectedCallback();
        document.addEventListener('click', this._onDocumentClicked);

        this.updateComplete.then(()=>{
            this.$select = this.$('#' + this.selectId);
            this.$select.disabled = true;
            // try an init when user-interface is loaded
            this.initJSONLD();
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
            if ($select.length && this.select2IsInitialized($select)) {
                $select.select2('close');
            }
        }
    }

    initJSONLD(ignorePreset = false) {
        const that = this;

        JSONLD.getInstance(this.entryPointUrl).then(function (jsonld) {
            that.jsonld = jsonld;

            // we need to poll because maybe the user interface isn't loaded yet
            // Note: we need to call initSelect2() in a different function so we can access "this" inside initSelect2()
            commonUtils.pollFunc(() => { return that.initSelect2(ignorePreset); }, 10000, 100);
        }, {}, this.lang);
    }

    isInt(value) {
        return !isNaN(value) && (function(x) { return (x | 0) === x; })(parseFloat(value));
    }

    getLibrary() {
        //console.log('getLibrary() organizationId = ' + this.organizationId);
        // until the API understands this:
        //this.organizationId == '/organizations/1263-F2190';
        // extracting the orgUnitCode (F2190) is done here:
        return this.organizationId.includes('-') ? this.organizationId.split('-')[1] : '';
    }

    /**
     * Initializes the Select2 selector
     * 
     * @param {boolean} ignorePreset
     */
    initSelect2(ignorePreset = false) {
        const that = this;
        const $that = $(this);

        if (this.jsonld === null) {
            return false;
        }

        // find the correct api url for a library book offer
        const apiUrl = this.jsonld.getApiUrlForEntityName("LibraryBookOffer");

        // the mapping we need for Select2
        const localContext = {
            "id": "@id",
            "text": "http://schema.org/name"
        };

        if (this.$select === null) {
            return false;
        }

        // we need to destroy Select2 and remove the event listeners before we can initialize it again
        if (this.$select.hasClass('select2-hidden-accessible')) {
            this.$select.select2('destroy');
            this.$select.off('select2:select');
            this.$select.off('select2:unselect');
        }

        this.$select.select2({
            width: '100%',
            language: this.lang === "de" ? select2LangDe() : select2LangEn(),
            minimumInputLength: 3,
            allowClear: true,
            placeholder: i18n.t('library-book-offer-select.placeholder'),
            dropdownParent: this.$('#library-book-offer-select-dropdown'),
            ajax: {
                delay: 250,
                url: apiUrl,
                contentType: "application/ld+json",
                beforeSend: function (jqXHR) {
                    // console.log("this.auth", that.auth);
                    jqXHR.setRequestHeader('Authorization', 'Bearer ' + that.auth.token);
                },
                data: function (params) {
                    let barcode = params.term.trim();

                    // add a "+" if the barcode is missing it
                    // first check if barcode is not a pure integer or starts with a "@"
                    if (!(that.isInt(barcode)) && barcode.substr(0,1) !== '+' && barcode.substr(0,1) !== '@') {
                        barcode = '+' + barcode;
                    }
                    return {
                        barcode: barcode,
                        library: that.getLibrary(),
                    };
                },
                processResults: function (data) {
                    that.$('#library-book-offer-select-dropdown').addClass('select2-bug');
                    that.lastResult = data;
                    const results = that.jsonld.transformMembers(data, localContext);

                    return {
                        results: results
                    };
                },
                error: (jqXHR, textStatus, errorThrown) => { this.handleXhrError(jqXHR, textStatus, errorThrown); }
            }
        }).on("select2:select", function (e) {
            that.$('#library-book-offer-select-dropdown').removeClass('select2-bug');
            const identifier = e.params.data.id;
            that.object = findObjectInApiResults(identifier, that.lastResult);

            if (that.object === undefined) {
                return;
            }

            // set custom element attributes
            $that.attr("data-object", JSON.stringify(that.object));
            $that.data("object", that.object);

            if ($that.attr("value") !== identifier) {
                that.ignoreValueUpdate = true;
                $that.attr("value", identifier);
                that.value = identifier;

                // fire a change event
                that.dispatchEvent(new CustomEvent('change', {
                    detail: {
                        value: identifier,
                    }
                }));
            }
        }).on('select2:unselect', function (e) {
            that.object = null;
            $that.attr("data-object", "");
            $that.data("object", {});
            that.ignoreValueUpdate = true;
            $that.attr("value", "");
            that.value = "";

            // fire a unselect event
            that.dispatchEvent(new CustomEvent('unselect'));
        });

        // preset a book offer
        if (!ignorePreset && this.value !== '' && this.value !== "null") {
            const apiUrl = this.entryPointUrl + this.value;

            fetch(apiUrl, {
                headers: {
                    'Content-Type': 'application/ld+json',
                    'Authorization': 'Bearer ' + that.auth.token,
                },
            })
            .then(result => {
                if (!result.ok) throw result;
                return result.json();
            })
            .then((bookOffer) => {
                that.object = bookOffer;
                const identifier = bookOffer["@id"];
                const option = new Option(bookOffer.name, identifier, true, true);
                $that.attr("data-object", JSON.stringify(bookOffer));
                $that.data("object", bookOffer);
                that.$select.val(null).append(option).trigger('change');

                // fire a change event
                that.dispatchEvent(new CustomEvent('change', {
                    detail: {
                        value: identifier,
                    },
                    bubbles: true
                }));
            }).catch(() => {
                that.clear();
            });
        }

        return true;
    }

    update(changedProperties) {
        changedProperties.forEach((oldValue, propName) => {
            switch (propName) {
                case "lang":
                    i18n.changeLanguage(this.lang);

                    if (this.select2IsInitialized()) {
                        // no other way to set an other language at runtime did work
                        this.initSelect2(true);
                    }
                    break;
                case "organizationId":
                    if (!this.organizationId) {
                        this.organizationId = '';
                    }
                    if (this.$select) {
                        this.$select.enable = this.organizationId.includes('-');
                    }
                    break;
                case "value":
                    if (!this.ignoreValueUpdate && this.select2IsInitialized()) {
                        this.initSelect2();
                    }

                    this.ignoreValueUpdate = false;
                    break;
                case "entryPointUrl":
                    // we don't need to preset the selector if the entry point url changes
                    this.initJSONLD(true);
                    break;
            }
        });

        super.update(changedProperties);
    }

    select2IsInitialized() {
        return this.$select !== null && this.$select.hasClass("select2-hidden-accessible");
    }

    reloadClick() {
        if (this.object === null) {
            return;
        }

        // fire a change event
        this.dispatchEvent(new CustomEvent('change', {
            detail: {
                value: this.value,
            },
            bubbles: true
        }));
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
                border: 1px solid #aaa;
                -moz-border-radius-topright: var(--dbp-border-radius);
                -moz-border-radius-bottomright: var(--dbp-border-radius);
                line-height: 100%;
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
            <link rel="stylesheet" href="${select2CSS}">
            <style>
                #${this.selectId} {width: 100%;}
                li.select2-selection__choice {white-space: normal;}
            </style>

            <div class="select">
                <div class="field has-addons">
                    <div class="select2-control control">
                        <!-- https://select2.org-->
                        <select id="${this.selectId}" name="book-offer" class="select"></select>
                    </div>
                    <a class="control button"
                       id="reload-button"
                       ?disabled=${this.object === null}
                       @click="${this.reloadClick}"
                       style="display: ${this.showReloadButton ? "flex" : "none"}"
                       title="${this.reloadButtonTitle}">
                        <dbp-icon name="reload"></dbp-icon>
                    </a>
                </div>
                <div id="library-book-offer-select-dropdown"></div>
            </div>
        `;
    }
}