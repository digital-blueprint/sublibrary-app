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
    }

    static get properties() {
        return {
            lang: { type: String },
        };
    }

    close() {
        this.$('#library-book-offer-select').select2('close');
    }

    connectedCallback() {
        super.connectedCallback();
        i18n.changeLanguage(this.lang);

        this.updateComplete.then(()=>{
            const that = this;
            const $that = $(this);
            let lastResult = {};

            JSONLD.initialize(utils.getAPiUrl(), function (jsonld) {
                // find the correct api url for a library book offer
                const apiUrl = jsonld.getApiUrlForEntityName("LibraryBookOffer");

                // the mapping we need for Select2
                const localContext = {
                    "id": "@id",
                    "text": "http://schema.org/name"
                };

                const $select = that.$('#library-book-offer-select');

                $select.select2({
                    width: '100%',
                    language: that.lang === "de" ? select2LangDe() : select2LangEn(),
                    minimumInputLength: 3,
                    maximumSelectionLength: 1,
                    placeholder: i18n.t('library-book-offer-select.placeholder'),
                    dropdownParent: that.$('#library-book-offer-select-dropdown'),
                    ajax: {
                        delay: 250,
                        url: apiUrl,
                        contentType: "application/ld+json",
                        beforeSend: function( jqXHR ) {
                            jqXHR.setRequestHeader('Authorization', 'Bearer ' + window.VPUAuthToken);
                        },
                        data: function (params) {
                            return {
                                barcode: params.term
                            };
                        },
                        processResults: function (data) {
                            console.log(data);
                            lastResult = data;

                            const results = jsonld.transformMembers(data, localContext);

                            console.log("results");
                            console.log(results);

                            return {
                                results: results
                            };
                        }
                    }
                }).on("select2:select", function(e) {
                    // set value of custom element select
                    const identifier = e.params.data.id;
                    $that.attr("value", identifier);
                    $that.val(identifier);

                    const object = utils.findObjectInApiResults(identifier, lastResult);
                    $that.attr("data-object", JSON.stringify(object));
                    $that.data("object", object);

                    // fire a change event
                    that.dispatchEvent(new CustomEvent('change', {
                        detail: {
                            value: identifier,
                        },
                        bubbles: true
                    }));
                }).on('select2:unselect', function (e) {
                    // fire a unselect event
                    that.dispatchEvent(new CustomEvent('unselect', {
                        bubbles: true
                    }));
                });

                $select.blur((e) => {
                    console.log("select blur");
                });

                // close the selector on blur of the web component
                $(that).blur(() => {
                    // the 500ms delay is a workaround to actually get an item selected when clicking on it,
                    // because the blur gets also fired when clicking in the selector
                    setTimeout(() => {$select.select2('close')}, 500);
                });
            });
        })
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