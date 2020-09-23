# Library Application

[GitLab Repository](https://gitlab.tugraz.at/dbp/apps/library)

![overview](docs/overview.svg)

## Prerequisites

- You need library officer permissions to be allowed to use the application
- You need the [API server](https://gitlab.tugraz.at/dbp/middleware/api) running on <http://127.0.0.1:8001> or access the [official api server](https://api.tugraz.at/)

## Local development

```bash
# get the source
git clone git@gitlab.tugraz.at:dbp/apps/library.git
cd library
git submodule update --init

# install dependencies
yarn install

# constantly build dist/bundle.js and run a local web-server on port 8001 
yarn run watch-local

# run tests
yarn test
```

Jump to <http://localhost:8001> and you should get a Single Sign On login page.

Example book barcodes: `+F58330104`, `+F58019101`, `+F53498803`


## Remote development

<https://mw-frontend-dev.tugraz.at/apps/library>

Run `yarn run watch-dev` to build the `dist/bundle.js` constantly and upload the `dist` folder to the server.

## Roll back a release

```bash
COMPOSER_VENDOR_DIR=_temp composer require "deployer/deployer" "deployer/recipes"
# Check if the config is pointing to the server you want
./_temp/bin/dep config:hosts production
# Do the rollback
./_temp/bin/dep rollback production
```

## Demo system

<https://frontend-demo.tugraz.at/apps/library>

Build bundle for the demo server

```bash
yarn run build-demo
```

## Browser versions

These browser versions should work with the application.

- Firefox 67+ (2019-05)
- Chrome 67+ (2018-05)
- Edge 79+ (2020-01)
- Safari 11.1+ (2018-04)
- Opera 64+ (2019-10)
- iOS Safari 12+/iOS 12+ (2018-09)

We use a row of newer features:

- https://caniuse.com/#feat=custom-elementsv1
- https://caniuse.com/#feat=es6-module-dynamic-import
- https://caniuse.com/#feat=shadowdomv1
- https://caniuse.com/#feat=mdn-javascript_statements_import_meta
- https://caniuse.com/#feat=es6-module
- https://caniuse.com/#feat=async-functions
