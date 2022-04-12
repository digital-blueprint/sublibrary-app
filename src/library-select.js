import {ResourceSelect} from '@dbp-toolkit/resource-select';
import {getLibraryCodeFromId} from './utils.js';

export class LibrarySelect extends ResourceSelect {
    constructor() {
        super();
        this.resourcePath = 'base/people';
    }

    buildUrl(select, url) {
        url += '/' + encodeURIComponent(select.auth['person-id']);
        url += '/organizations';
        url +=
            '?' + new URLSearchParams({lang: select.lang, context: 'library-manager'}).toString();
        return url;
    }

    formatResource(select, resource) {
        return `${resource['name']} (${getLibraryCodeFromId(resource['identifier'])})`;
    }
}
