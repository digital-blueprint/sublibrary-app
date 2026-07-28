import {ResourceSelect} from '@dbp-toolkit/resource-select';

export class LibrarySelect extends ResourceSelect {
    constructor() {
        super();
        this.resourcePath = 'sublibrary/sublibraries';
    }

    formatResource(select, resource) {
        return `${resource['name']} (${resource['code']})`;
    }
}
