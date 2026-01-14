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
                libraryManager: encodeURIComponent(select.auth['user-id']),
            }).toString();
        return url;
    }

    formatResource(select, resource) {
        return `${resource['name']} (${resource['code']})`;
    }
}
