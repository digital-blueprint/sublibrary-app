import $ from 'jquery';
import utils from './utils.js';
import select2 from 'select2';
import select2LangDe from './i18n/de/select2'
import select2LangEn from './i18n/en/select2'
import JSONLD from './jsonld.js';
import {html, LitElement} from 'lit-element';
import {i18n, dateTimeFormat, numberFormat} from './i18n.js';

select2(window, $);

class LibraryBookOfferSelect extends LitElement {

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

            JSONLD.initialize(utils.getAPiUrl(), function (jsonld) {
                // find the correct api url for a library book offer
                const apiUrl = jsonld.getApiUrlForEntityName("LibraryBookOffer");

                // the mapping we need for Select2
                const localContext = {
                    "id": "@id",
                    "text": "http://schema.org/name"
                };

                $(that.shadowRoot.querySelector('#library-book-offer-select')).select2({
                    language: that.lang === "de" ? select2LangDe() : select2LangEn(),
                    minimumInputLength: 3,
                    maximumSelectionLength: 1,
                    placeholder: i18n.t('library-book-offer-select.placeholder'),
                    dropdownParent: $(that.shadowRoot.querySelector('#library-book-offer-select-dropdown')),
                    ajax: {
                        delay: 250,
                        url: apiUrl,
                        contentType: "application/ld+json",
                        data: function (params) {
                            return {
                                barcode: params.term
                            };
                        },
                        processResults: function (data) {
                            console.log(data);

                            const results = jsonld.transformMembers(data, localContext);

                            console.log("results");
                            console.log(results);

                            return {
                                results: results
                            };
                        }
                    }
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
