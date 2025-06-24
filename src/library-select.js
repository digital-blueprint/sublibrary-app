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
                // FIXME: lang can be removed once relay-sublibrary-bundle v0.5.5 is deployed
                lang: select.lang,
                libraryManager: encodeURIComponent(select.auth['user-id']),
            }).toString();
        return url;
    }

    formatResource(select, resource) {
        return `${resource['name']} (${resource['code']})`;
    }
}
