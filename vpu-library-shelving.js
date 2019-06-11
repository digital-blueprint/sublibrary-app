import $ from 'jquery';
import utils from './utils.js';
import select2 from 'select2';
import select2LangDe from './i18n/de/select2'
import select2LangEn from './i18n/en/select2'
import JSONLD from './jsonld.js';
import {html, LitElement} from 'lit-element';
import {i18n, dateTimeFormat, numberFormat} from './i18n.js';

select2(window, $);

class LibraryShelving extends LitElement {

    constructor() {
        super();
        this.lang = 'de';
        this.prop1 = 'Person';
    }

    static get properties() {
        return {
            prop1: { type: String },
            lang: { type: String },
        };
    }

    connectedCallback() {
        super.connectedCallback();
        i18n.changeLanguage(this.lang);

        this.updateComplete.then(()=>{
            const that = this;

        })
    }

    render() {
        return html`
            <style>
            </style>
            <h1>${this.prop1}</h1>

            <p>
                <vpu-library-person-select lang="${this.lang}"></vpu-library-person-select>
            </p>
            <p>
                <vpu-library-book-offer-select lang="${this.lang}"></vpu-library-book-offer-select>
            </p>
        `;
    }
}

customElements.define('vpu-library-shelving', LibraryShelving);
