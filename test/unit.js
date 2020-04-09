import {assert} from 'chai';

import '../src/vpu-library-shelving';
import '../src/vpu-library.js';

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
    node = document.createElement('vpu-app');
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