import $ from 'jquery';
import utils from './utils.js';
import select2 from 'select2';
import JSONLD from './jsonld.js';
import {html, LitElement} from 'lit-element';

select2(window, $);

class PersonSelect extends LitElement {

    constructor() {
        super();
        this.prop1 = 'Person';
    }

    static get properties() {
        return {
            prop1: { type: String },
        };
    }

    connectedCallback() {
        super.connectedCallback();
        const url = 'https://mw-dev.tugraz.at/api/people';

        this.updateComplete.then(()=>{
            const foreignContext = {"@context":{"@vocab":"http:\/\/127.0.0.1:8000\/api\/docs.jsonld#","hydra":"http:\/\/www.w3.org\/ns\/hydra\/core#","personId":"Person\/personId","name":"http:\/\/schema.org\/name","firstName":"http:\/\/schema.org\/givenName","lastName":"http:\/\/schema.org\/familyName","email":"http:\/\/schema.org\/email"}};
            const localContext = {
                "id": "@id",
                "text": "http://schema.org/name"
            };
            let jsonld = new JSONLD(foreignContext, localContext);
            console.log(jsonld);

            $(this.shadowRoot.querySelector('#person-select')).select2({
                minimumInputLength: 2,
                placeholder: 'Select a person',
                dropdownParent: $(this.shadowRoot.querySelector('#person-select-dropdown')),
                ajax: {
                    delay: 250,
                    url: url,
                    contentType: "application/ld+json",
                    data: function (params) {
                        return {
                            search: params.term,
                            'library-only': 1
                        };
                    },
                    processResults: function (data) {
                        console.log(data);

                        const results = jsonld.transformResult(data);

                        console.log("results");
                        console.log(results);

                        return {
                            results: results
                        };
                    }
                }
            });
        })
    }

    render() {
        const select2CSS = utils.getAssetURL('select2/css/select2.css');

        return html`
            <link rel="stylesheet" href="${select2CSS}">
            <style>
                #person-select {
                    width: 100%;
                }
            </style>
            <h1>${this.prop1}</h1>

            <!-- https://select2.org-->
            <select id="person-select" name="person"></select>
            <div id="person-select-dropdown"></div>
        `;
    }
}

customElements.define('vpu-library-person-select', PersonSelect);
