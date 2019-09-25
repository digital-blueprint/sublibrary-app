import '../src/vpu-library-shelving';
import '../src/vpu-library-app.js';

describe('vpu-library-shelving basics', () => {
  let node;

  beforeEach(async () => {
    node = document.createElement('vpu-library-shelving');
    document.body.appendChild(node);
    await node.updateComplete;
  });

  afterEach(() => {
    node.remove();
  });

  it('should render', () => {
      expect(node).to.have.property('shadowRoot');
  });
});

describe('vpu-library-app basics', () => {
  let node;

  beforeEach(async () => {
    node = document.createElement('vpu-library-app');
    document.body.appendChild(node);
    await node.updateComplete;
  });

  afterEach(() => {
    node.remove();
  });

  it('should render', () => {
      expect(node).to.have.property('shadowRoot');
  });
});
