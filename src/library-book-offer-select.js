import $ from 'jquery';
import {findObjectInApiResults} from './utils.js';
import select2 from 'select2';
import select2LangDe from './i18n/de/select2-book-offer';
import select2LangEn from './i18n/en/select2-book-offer';
import JSONLD from 'vpu-common/jsonld';
import {css, html, LitElement} from 'lit-element';
import {ScopedElementsMixin} from '@open-wc/scoped-elements';
import {createI18nInstance} from './i18n.js';
import {Icon} from "vpu-common";
import * as commonUtils from "vpu-common/utils";
import * as commonStyles from 'vpu-common/styles';
import * as errorUtils from "vpu-common/error";
import select2CSSPath from 'select2/dist/css/select2.min.css';


select2(window, $);

const i18n = createI18nInstance();

export class LibraryBookOfferSelect extends ScopedElementsMixin(LitElement) {

    constructor() {
        super();
        this.lang = 'de';
        this.entryPointUrl = commonUtils.getAPiUrl();
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
    }

    static get scopedElements() {
        return {
          'vpu-icon': Icon,
        };
    }

    $(selector) {
        return $(this.shadowRoot.querySelector(selector));
    }

    static get properties() {
        return {
            lang: { type: String },
            entryPointUrl: { type: String, attribute: 'entry-point-url' },
            value: { type: String },
            object: { type: Object, attribute: false },
            showReloadButton: { type: Boolean, attribute: 'show-reload-button' },
            reloadButtonTitle: { type: String, attribute: 'reload-button-title' },
            organizationId: { type: String, attribute: 'organization-id' },
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
        const that = this;

        this.updateComplete.then(()=>{
            that.$select = that.$('#' + that.selectId);
            that.$select.disabled = true;

            // close the selector on blur of the web component
            $(that).blur(() => {
                // the 500ms delay is a workaround to actually get an item selected when clicking on it,
                // because the blur gets also fired when clicking in the selector
                setTimeout(() => {
                    if (this.select2IsInitialized()) {
                        that.$select.select2('close');
                    }
                }, 500);
            });

            // try an init when user-interface is loaded
            that.initJSONLD();
        });
    }

    initJSONLD(ignorePreset = false) {
        const that = this;

        JSONLD.initialize(this.entryPointUrl, function (jsonld) {
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
                    jqXHR.setRequestHeader('Authorization', 'Bearer ' + window.VPUAuthToken);
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
                    that.lastResult = data;
                    const results = that.jsonld.transformMembers(data, localContext);

                    return {
                        results: results
                    };
                },
                error: errorUtils.handleXhrError
            }
        }).on("select2:select", function (e) {
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
                    'Authorization': 'Bearer ' + window.VPUAuthToken,
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
                -moz-border-radius-topright: var(--vpu-border-radius);
                -moz-border-radius-bottomright: var(--vpu-border-radius);
                line-height: 100%;
            }

            .field .button.control vpu-icon {
                top: 0;
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
                        <vpu-icon name="reload"></vpu-icon>
                    </a>
                </div>
                <div id="library-book-offer-select-dropdown"></div>
            </div>
        `;
    }
}