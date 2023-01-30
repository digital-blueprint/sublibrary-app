# Sublibrary Application

[GitHub Repository](https://github.com/digital-blueprint/sublibrary-app) |
[npmjs package](https://www.npmjs.com/package/@digital-blueprint/sublibrary-app) |
[Unpkg CDN](https://unpkg.com/browse/@digital-blueprint/sublibrary-app/) |
[Sublibrary Bundle](https://gitlab.tugraz.at/dbp/sublibrary/dbp-relay-sublibrary-bundle)

[![Build and Test](https://github.com/digital-blueprint/sublibrary-app/actions/workflows/build-test-publish.yml/badge.svg)](https://github.com/digital-blueprint/sublibrary-app/actions/workflows/build-test-publish.yml)

![overview](https://raw.githubusercontent.com/digital-blueprint/sublibrary-app/main/docs/overview.svg)

With the dbp sublibrary app you can assign call number, borrow books, return library books, extend loan periods, 
show current loans, show current book orders and show the budgets.

## Prerequisites

- You need library officer permissions to be allowed to use the application
- You need the [API server](https://gitlab.tugraz.at/dbp/relay/dbp-relay-server-template) running
- You need the [Dbp Relay Sublibrary Bundle](https://gitlab.tugraz.at/dbp/sublibrary/dbp-relay-sublibrary-bundle) for the API server to talk to the Alma backend

## Local development

```bash
# get the source
git clone git@github.com:digital-blueprint/sublibrary-app.git
cd library
git submodule update --init

# install dependencies
yarn install

# constantly build dist/bundle.js and run a local web-server on port 8001 
yarn run watch-local

# run tests
yarn test
```

Jump to <http://localhost:8001>, and you should get a Single Sign On login page.

Example book barcodes: `+F58330104`, `+F58019101`, `+F53498803`


## Remote development

<https://dbp-dev.tugraz.at/apps/library>

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

<https://dbp-demo.tugraz.at/apps/library>

Build bundle for the demo environment

```bash
APP_ENV=demo yarn run build
```

## Using this app as pre-built package

### Install app

If you want to install the dbp sublibrary app in a new folder `sublibrary-app` with a path prefix `/` you can call:

```bash
npx @digital-blueprint/cli install-app sublibrary sublibrary-app /
```

Afterwards you can point your Apache web-server to `sublibrary-app/public`.

Make sure you are allowing `.htaccess` files in your Apache configuration.

Also make sure to add all of your resources you are using (like your API and Keycloak servers) to the
`Content-Security-Policy` in your `sublibrary-app/public/.htaccess`, so the browser allows access to those sites.

You can also use this app directly from the [Unpkg CDN](https://unpkg.com/browse/@digital-blueprint/sublibrary-app/)
for example like this: [dbp-sublibrary/index.html](https://github.com/digital-blueprint/sublibrary-app/-/tree/master/examples/dbp-sublibrary/index.html)

Note that you will need a Keycloak server along with a client id for the domain you are running this html on.

### Update app

If you want to update the dbp sublibrary app in the current folder you can call:

```bash
npx @digital-blueprint/cli update-app library
```

## Activities

This app has the following activities:
- `dbp-sublibrary-book-list`
- `dbp-sublibrary-budget`
- `dbp-sublibrary-create-loan`
- `dbp-sublibrary-loan-list`
- `dbp-sublibrary-order-list`
- `dbp-sublibrary-renew-loan`
- `dbp-sublibrary-return-book`
- `dbp-sublibrary-shelving`

You can find the documentation of these activities in the [sublibrary activities documentation](https://github.com/digital-blueprint/sublibrary-app/-/tree/master/src).

## Adapt app

### Functionality

You can add multiple attributes to the `<dbp-sublibrary>` tag.

| attribute name | value | Link to description |
|----------------|-------| ------------|
| `provider-root` | Boolean | [app-shell](https://gitlab.tugraz.at/dbp/web-components/toolkit/-/tree/master/packages/app-shell#attributes) |
| `lang`         | String | [language-select](https://gitlab.tugraz.at/dbp/web-components/toolkit/-/tree/master/packages/language-select#attributes) | 
| `entry-point-url` | String | [app-shell](https://gitlab.tugraz.at/dbp/web-components/toolkit/-/tree/master/packages/app-shell#attributes) |
| `keycloak-config` | Object | [app-shell](https://gitlab.tugraz.at/dbp/web-components/toolkit/-/tree/master/packages/app-shell#attributes) |
| `base-path` | String | [app-shell](https://gitlab.tugraz.at/dbp/web-components/toolkit/-/tree/master/packages/app-shell#attributes) |
| `src` | String | [app-shell](https://gitlab.tugraz.at/dbp/web-components/toolkit/-/tree/master/packages/app-shell#attributes) |
| `html-overrides` | String | [common](https://gitlab.tugraz.at/dbp/web-components/toolkit/-/tree/master/packages/common#overriding-slots-in-nested-web-components) |
| `themes` | Array | [theme-switcher](https://gitlab.tugraz.at/dbp/web-components/toolkit/-/tree/master/packages/theme-switcher#themes-attribute) |
| `darkModeThemeOverride` | String | [theme-switcher](https://gitlab.tugraz.at/dbp/web-components/toolkit/-/tree/master/packages/theme-switcher#themes-attribute) |

#### Mandatory attributes

If you are not using the `provider-root` attribute to "terminate" all provider attributes
you need to manually add these attributes so that the topic will work properly:

```html
<dbp-sublibrary
        auth
        requested-login-status
        analytics-event
>
</dbp-sublibrary>
```

### Design

For frontend design customizations, such as logo, colors, font, favicon, and more, take a look at the [theming documentation](https://dbp-demo.tugraz.at/dev-guide/frontend/theming/).

## "dbp-sublibrary" slots

These are common slots for the app-shell. You can find the documentation of these slots in the [app-shell documentation](https://gitlab.tugraz.at/dbp/web-components/toolkit/-/tree/master/packages/app-shell).
For the app specific slots take a look at the [sublibrary activities](https://github.com/digital-blueprint/sublibrary-app/-/tree/master/src).

