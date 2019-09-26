import {assert} from 'chai';

import '../src/vpu-library-shelving';
import '../src/vpu-library-app.js';

suite('vpu-library-shelving basics', () => {
  let node;

  suiteSetup(async () => {
    node = document.createElement('vpu-library-shelving');
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

suite('vpu-library-app basics', () => {
  let node;

  suiteSetup(async () => {
    node = document.createElement('vpu-library-app');
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
