import {assert} from 'chai';

import '../src/dbp-library-shelving';
import '../src/dbp-library.js';

suite('dbp-library-shelving basics', () => {
    let node;

    suiteSetup(async () => {
        node = document.createElement('dbp-library-shelving');
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

suite('dbp-library-app basics', () => {
    let node;

    suiteSetup(async () => {
        node = document.createElement('dbp-app');
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
