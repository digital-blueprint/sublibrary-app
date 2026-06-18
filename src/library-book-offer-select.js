import {ResourceSelect} from '@dbp-toolkit/resource-select';
import {createInstance} from './i18n.js';

function isInt(value) {
    return (
        !isNaN(value) &&
        (function (x) {
            return (x | 0) === x;
        })(parseFloat(value))
    );
}

export class LibraryBookOfferSelect extends ResourceSelect {
    constructor() {
        super();
        this._bookOfferI18n = createInstance();
        this.resourcePath = 'sublibrary/book-offers';
        this.fetchMode = 'search';
        this.noDefault = true;
        this.placeholder = this._bookOfferI18n.t('library-book-offer-select.placeholder');
        this.sublibraryIri = '';
    }

    static get properties() {
        return {
            ...super.properties,
            sublibraryIri: {type: String, attribute: 'sublibrary-iri'},
        };
    }

    clear() {
        this.value = null;
    }

    getSearchQueryParameters(select, searchTerm) {
        let barcode = searchTerm.trim();

        if (
            barcode &&
            !isInt(barcode) &&
            barcode.substr(0, 1) !== '+' &&
            barcode.substr(0, 1) !== '@'
        ) {
            barcode = '+' + barcode;
        }

        return {
            barcode: barcode,
            sublibrary: (this.sublibraryIri ?? '').split('/').slice(-1)[0],
        };
    }

    formatResource(select, bookOffer) {
        return bookOffer.name ?? bookOffer['@id'];
    }

    update(changedProperties) {
        if (changedProperties.has('lang')) {
            this._bookOfferI18n.changeLanguage(this.lang);
            this.placeholder = this._bookOfferI18n.t('library-book-offer-select.placeholder');
        }

        super.update(changedProperties);
    }
}
