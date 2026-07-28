import {ResourceSelect} from '@dbp-toolkit/resource-select';

/**
 * Returns the API URL for listing all sublibraries the given user manages.
 *
 * @param {string} entryPointUrl - The API entry point URL
 * @param {string} userId - The ID of the user
 * @returns {string} The URL for fetching the sublibraries of the user
 */
export function getSublibraryCollectionUrl(entryPointUrl, userId) {
    const url = new URL('sublibrary/sublibraries', entryPointUrl);
    url.search = new URLSearchParams({
        libraryManager: encodeURIComponent(userId),
    }).toString();

    return url.href;
}

export class LibrarySelect extends ResourceSelect {
    constructor() {
        super();
        this.resourcePath = 'sublibrary';
    }

    buildUrl(select, url) {
        return getSublibraryCollectionUrl(select.entryPointUrl, select.auth['user-id']);
    }

    formatResource(select, resource) {
        return `${resource['name']} (${resource['code']})`;
    }
}
