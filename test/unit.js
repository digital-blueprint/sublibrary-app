import {assert} from 'chai';

import '../src/dbp-sublibrary-shelving';
import '../src/dbp-sublibrary.js';

suite('dbp-sublibrary-shelving basics', () => {
    let node;

    suiteSetup(async () => {
        node = document.createElement('dbp-sublibrary-shelving');
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

suite('dbp-sublibrary-app basics', () => {
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
