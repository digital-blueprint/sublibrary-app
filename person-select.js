import $ from 'jquery';
import utils from './utils.js';
import select2 from 'select2';
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

            $(this.shadowRoot.querySelector('#person-select')).select2({
                placeholder: 'Select a person',
                dropdownParent: $(this.shadowRoot.querySelector('#person-select-dropdown')),
                ajax: {
                    url: url,
                    data: function (params) {
                        return {
                            search: params.term,
                            'library-only': 1
                        };
                    },
                    processResults: function (data) {
                        const results = [];

                        data['hydra:member'].forEach(function (person) {
                            results.push({"id": person['@id'], "text": person.name});
                        });

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
