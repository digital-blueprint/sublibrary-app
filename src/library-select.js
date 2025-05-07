import {ResourceSelect} from '@dbp-toolkit/resource-select';

export class LibrarySelect extends ResourceSelect {
    constructor() {
        super();
        this.resourcePath = 'sublibrary';
    }

    buildUrl(select, url) {
        url += '/sublibraries';
        url +=
            '?' +
            new URLSearchParams({
                lang: select.lang,
                libraryManager: encodeURIComponent(select.auth['person-id']),
            }).toString();
        return url;
    }

    formatResource(select, resource) {
        return `${resource['name']} (${resource['code']})`;
    }
}
