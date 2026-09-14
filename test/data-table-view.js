import {assert} from 'chai';

import '../src/data-table-view/dbp-data-table-view.js';

suite('dbp-data-table-view basics', () => {
    let node;

    suiteSetup(async () => {
        node = document.createElement('dbp-data-table-view');
        document.body.appendChild(node);
        await node.updateComplete;
    });

    suiteTeardown(() => {
        node.remove();
    });

    test('should render', () => {
        assert(node.shadowRoot !== undefined);
    });
});
