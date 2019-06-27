import $ from 'jquery';
import utils from './utils.js';
import select2 from 'select2';
import select2LangDe from './i18n/de/select2'
import select2LangEn from './i18n/en/select2'
import JSONLD from './jsonld.js';
import {html, LitElement} from 'lit-element';
import {i18n, dateTimeFormat, numberFormat} from './i18n.js';

select2(window, $);

class PersonSelect extends LitElement {

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

            JSONLD.initialize(utils.getAPiUrl(), function (jsonld) {
                // find the correct api url for a person
                const apiUrl = jsonld.getApiUrlForIdentifier("http://schema.org/Person");
                // const apiUrl = jsonld.getApiUrlForEntityName("Event");

                // the mapping we need for Select2
                const localContext = {
                    "id": "@id",
                    "text": "http://schema.org/name"
                };

                $(that.shadowRoot.querySelector('#person-select')).select2({
                    language: that.lang === "de" ? select2LangDe() : select2LangEn(),
                    minimumInputLength: 2,
                    placeholder: i18n.t('person-select.placeholder'),
                    dropdownParent: $(that.shadowRoot.querySelector('#person-select-dropdown')),
                    ajax: {
                        delay: 250,
                        url: apiUrl,
                        contentType: "application/ld+json",
                        data: function (params) {
                            return {
                                search: params.term,
                                'library-only': 1
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
                }).on("select2:select", function(e) {
                    // set value custom element
                    $that.attr("value", e.params.data.id);
                    $that.val(e.params.data.id);

                    // fire a change event
                    that.dispatchEvent(new CustomEvent('change', {
                        detail: {
                            value: e.params.data.id,
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
                #person-select {
                    width: 100%;
                }
            </style>

            <!-- https://select2.org-->
            <b>${i18n.t('person-select.headline')}</b>
            <select id="person-select" name="person"></select>
            <div id="person-select-dropdown"></div>
        `;
    }
}

customElements.define('vpu-library-person-select', PersonSelect);
