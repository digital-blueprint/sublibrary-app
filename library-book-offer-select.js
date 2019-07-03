import $ from 'jquery';
import utils from './utils.js';
import select2 from 'select2';
import select2LangDe from './i18n/de/select2'
import select2LangEn from './i18n/en/select2'
import JSONLD from './jsonld.js';
import {html} from 'lit-element';
import {i18n, dateTimeFormat, numberFormat} from './i18n.js';
import VPULitElement from "./vpu-lit-element";

select2(window, $);

class LibraryBookOfferSelect extends VPULitElement {

    constructor() {
        super();
        this.lang = 'de';
    }

    static get properties() {
        return {
            lang: { type: String },
        };
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

                that.$('#library-book-offer-select').select2({
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

                    // fire a change event
                    that.dispatchEvent(new CustomEvent('change', {
                        detail: {
                            value: identifier,
                        },
                        bubbles: true
                    }));
                });
            });
        })
    }

    render() {
        const select2CSS = utils.getAssetURL('select2/css/select2.min.css');

        return html`
            <link rel="stylesheet" href="${select2CSS}">
            <style>
                #library-book-offer-select {
                    width: 100%;
                }
            </style>

            <!-- https://select2.org-->
            <b>${i18n.t('library-book-offer-select.headline')}</b>
            <select id="library-book-offer-select" multiple="multiple" name="person"></select>
            <div id="library-book-offer-select-dropdown"></div>
        `;
    }
}

customElements.define('vpu-library-book-offer-select', LibraryBookOfferSelect);
