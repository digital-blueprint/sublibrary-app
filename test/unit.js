import {assert} from 'chai';

import '../src/vpu-library-shelving';
import '../src/vpu-library-app.js';
import {Router} from '../src/router.js';

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

suite('router', () => {

  test('basics', () => {
    const routes = [
      {
          name: 'foo',
          path: '',
          action: (context) => {
              return {};
          }
      },
    ];

    const router = new Router(routes, {
      routeName: 'foo',
      getState: () => { return {}; },
      setState: (state) => { },
    });

    router.setStateFromCurrentLocation();
    router.updateRouter();
    router.updateRouterFromPathname("/");
    assert.equal(router.getRoutePathname(), '/');
  });
});