import $ from 'jquery';
import utils from './utils.js';
import select2 from 'select2';
import select2LangDe from './i18n/de/select2'
import select2LangEn from './i18n/en/select2'
import JSONLD from 'vpu-common/jsonld';
import {html} from 'lit-element';
import {i18n, dateTimeFormat, numberFormat} from './i18n.js';
import VPULitElementJQuery from 'vpu-common/vpu-lit-element-jquery';

select2(window, $);

class LibraryBookOfferSelect extends VPULitElementJQuery {

    constructor() {
        super();
        this.lang = 'de';
        this.entryPointUrl = utils.getAPiUrl();
        this.jsonld = null;
        this.$select = null;
    }

    static get properties() {
        return {
            lang: { type: String },
            entryPointUrl: { type: String, attribute: 'entry-point-url' },
        };
    }

    close() {
        this.$select.select2('close');
    }

    connectedCallback() {
        super.connectedCallback();
        const that = this;

        this.updateComplete.then(()=>{
            that.$select = that.$('#library-book-offer-select');

            // close the selector on blur of the web component
            $(that).blur(() => {
                // the 500ms delay is a workaround to actually get an item selected when clicking on it,
                // because the blur gets also fired when clicking in the selector
                setTimeout(() => {that.$select.select2('close')}, 500);
            });
        })
    }

    /**
     * Initializes the Select2 selector
     */
    initSelect2() {
        const that = this;
        const $that = $(this);
        let lastResult = {};

        // find the correct api url for a library book offer
        const apiUrl = this.jsonld.getApiUrlForEntityName("LibraryBookOffer");

        // the mapping we need for Select2
        const localContext = {
            "id": "@id",
            "text": "http://schema.org/name"
        };

        if (this.$select.hasClass('select2-hidden-accessible')) {
            this.$select.select2('destroy');
        }

        this.$select.select2({
            width: '100%',
            language: this.lang === "de" ? select2LangDe() : select2LangEn(),
            minimumInputLength: 3,
            maximumSelectionLength: 1,
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
                    return {
                        barcode: params.term
                    };
                },
                processResults: function (data) {
                    lastResult = data;
                    const results = that.jsonld.transformMembers(data, localContext);

                    return {
                        results: results
                    };
                }
            }
        }).on("select2:select", function (e) {
            const identifier = e.params.data.id;
            const object = utils.findObjectInApiResults(identifier, lastResult);

            if (object === undefined) {
                return;
            }

            // set value of custom element select
            $that.attr("value", identifier);
            $that.val(identifier);

            $that.attr("data-object", JSON.stringify(object));
            $that.data("object", object);

            // fire a change event
            that.dispatchEvent(new CustomEvent('change', {
                detail: {
                    value: identifier,
                }
            }));
        }).on('select2:unselect', function (e) {
            // fire a unselect event
            that.dispatchEvent(new CustomEvent('unselect'));
        });

        return this.$select;
    }

    updated(changedProperties) {
        changedProperties.forEach((oldValue, propName) => {
            switch (propName) {
                case "lang":
                    i18n.changeLanguage(this.lang);

                    if (this.$select !== null && this.$select.hasClass("select2-hidden-accessible")) {
                        // no other way to set an other language at runtime did work
                        this.initSelect2();
                    }
                    break;
                case "entryPointUrl":
                    const that = this;

                    JSONLD.initialize(this.entryPointUrl, function (jsonld) {
                        that.jsonld = jsonld;
                        that.$select = that.initSelect2();
                    });
                    break;
            }
        });
    }

    render() {
        const select2CSS = utils.getAssetURL('select2/css/select2.min.css');

        return html`
            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/bulma/0.7.5/css/bulma.min.css">
            <link rel="stylesheet" href="${select2CSS}">
            <style>
                #library-book-offer-select {
                    width: 100%;
                }
            </style>

            <!-- https://select2.org-->
            <select id="library-book-offer-select" multiple="multiple" name="person" class="select"></select>
            <div id="library-book-offer-select-dropdown"></div>
        `;
    }
}

customElements.define('vpu-library-book-offer-select', LibraryBookOfferSelect);
