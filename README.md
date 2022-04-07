# Sublibrary Application

[GitLab Repository](https://gitlab.tugraz.at/dbp/sublibrary/sublibrary) |
[npmjs package](https://www.npmjs.com/package/@dbp-topics/sublibrary) |
[Unpkg CDN](https://unpkg.com/browse/@dbp-topics/sublibrary/)

![overview](docs/overview.svg)

## Prerequisites

- You need library officer permissions to be allowed to use the application
- You need the [API server](https://gitlab.tugraz.at/dbp/middleware/api) running on <http://127.0.0.1:8000> or access the [official api server](https://api.tugraz.at/)

## Local development

```bash
# get the source
git clone git@gitlab.tugraz.at:dbp/sublibrary/sublibrary.git
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

If you want to install the DBP Library App in a new folder `library-app` with a path prefix `/` you can call:

```bash
npx @digital-blueprint/cli install-app library library-app /
```

Afterwards you can point your Apache web-server to `library-app/public`.

Make sure you are allowing `.htaccess` files in your Apache configuration.

Also make sure to add all of your resources you are using (like your API and Keycloak servers) to the
`Content-Security-Policy` in your `library-app/public/.htaccess`, so the browser allows access to those sites.

You can also use this app directly from the [Unpkg CDN](https://unpkg.com/browse/@dbp-topics/sublibrary/)
for example like this: [dbp-library/index.html](https://gitlab.tugraz.at/dbp/sublibrary/sublibrary/-/tree/master/examples/dbp-library/index.html)

Note that you will need a Keycloak server along with a client id for the domain you are running this html on.

### Update app

If you want to update the DBP Library App in the current folder you can call:

```bash
npx @digital-blueprint/cli update-app library
```

## Activities

### dbp-library-book-list

You can use this activity to list all books for an organisation. You cal also filter
the list by location and/or by inventory year. 

Note that you will need a Keycloak server along with a client id for the domain you are running this html on.

#### Attributes

- `lang` (optional, default: `de`): set to `de` or `en` for German or English
    - example `lang="de"`
- `entry-point-url` (optional, default is the TU Graz entry point url): entry point url to access the api
    - example `entry-point-url="https://api-dev.tugraz.at"`
- `auth` object: you need to set that object property for the auth token
    - example auth property: `{token: "THE_BEARER_TOKEN"}`
    - note: most often this should be an attribute that is not set directly, but subscribed at a provider
- `organization-id` (optional, default is the first in organisations list): id of the organisation library to which the user needs access rights.
  - example: `organization-id="1190-F2050"`

### dbp-library-budget

You can use this activity to retrieve the budget for an organisation library.

Note that you will need a Keycloak server along with a client id for the domain you are running this html on.

#### Attributes

- `lang` (optional, default: `de`): set to `de` or `en` for German or English
  - example `lang="de"`
- `entry-point-url` (optional, default is the TU Graz entry point url): entry point url to access the api
  - example `entry-point-url="https://api-dev.tugraz.at"`
- `auth` object: you need to set that object property for the auth token
  - example auth property: `{token: "THE_BEARER_TOKEN"}`
  - note: most often this should be an attribute that is not set directly, but subscribed at a provider
- `organization-id` (optional, default is the first in organisations list): id of the organisation library to which the user needs access rights.
  - example: `organization-id="681-F1490"`

### dbp-library-create-loan

You can use this activity to

Note that you will need a Keycloak server along with a client id for the domain you are running this html on.

#### Attributes

- `lang` (optional, default: `de`): set to `de` or `en` for German or English
  - example `lang="de"`
- `entry-point-url` (optional, default is the TU Graz entry point url): entry point url to access the api
  - example `entry-point-url="https://api-dev.tugraz.at"`
- `auth` object: you need to set that object property for the auth token
  - example auth property: `{token: "THE_BEARER_TOKEN"}`
  - note: most often this should be an attribute that is not set directly, but subscribed at a provider
- `organization-id` (optional, default is the first in organisations list): id of the organisation library to which the user needs access rights.
  - example: `organization-id="681-F1490"`
- `book-offer-id`: id of the book to borrow
  - example: `book-offer-id="+F20313804"`
- `person-id`: id of the person to borrow the book
  - example: `person-id="demo1dbp"`

### dbp-library-loan-list

You can use this activity to all loans for an organisation library.

Note that you will need a Keycloak server along with a client id for the domain you are running this html on.

#### Attributes

- `lang` (optional, default: `de`): set to `de` or `en` for German or English
  - example `lang="de"`
- `entry-point-url` (optional, default is the TU Graz entry point url): entry point url to access the api
  - example `entry-point-url="https://api-dev.tugraz.at"`
- `auth` object: you need to set that object property for the auth token
  - example auth property: `{token: "THE_BEARER_TOKEN"}`
  - note: most often this should be an attribute that is not set directly, but subscribed at a provider
- `organization-id` (optional, default is the first in organisations list): id of the organisation library to which the user needs access rights.
  - example: `organization-id="1190-F2050"`

### dbp-library-order-list

You can use this activity to list the orders for an organisation library.

Note that you will need a Keycloak server along with a client id for the domain you are running this html on.

#### Attributes

- `lang` (optional, default: `de`): set to `de` or `en` for German or English
  - example `lang="de"`
- `entry-point-url` (optional, default is the TU Graz entry point url): entry point url to access the api
  - example `entry-point-url="https://api-dev.tugraz.at"`
- `auth` object: you need to set that object property for the auth token
  - example auth property: `{token: "THE_BEARER_TOKEN"}`
  - note: most often this should be an attribute that is not set directly, but subscribed at a provider
- `organization-id` (optional, default is the first in organisations list): id of the organisation library to which the user needs access rights.
  - example: `organization-id="1190-F2050"`

### dbp-library-renew-loan

You can use this activity to list all loans a person has. The organisation is used as a filter (so each library officer 
sees only loans for books he/she has to manage).

Note that you will need a Keycloak server along with a client id for the domain you are running this html on.

#### Attributes

- `lang` (optional, default: `de`): set to `de` or `en` for German or English
  - example `lang="de"`
- `entry-point-url` (optional, default is the TU Graz entry point url): entry point url to access the api
  - example `entry-point-url="https://api-dev.tugraz.at"`
- `auth` object: you need to set that object property for the auth token
  - example auth property: `{token: "THE_BEARER_TOKEN"}`
  - note: most often this should be an attribute that is not set directly, but subscribed at a provider
- `person-id`: id of the person to borrow the book
  - example: `person-id="demo1dbp"`
- `organization-id` (optional, default is the first in organisations list): id of the organisation library to which the user needs access rights.
  - example: `organization-id="681-F1490"`

### dbp-library-return-book

You can use this activity to return a borrowed book. Each library office can only accept books from the library he/she
manages.

Note that you will need a Keycloak server along with a client id for the domain you are running this html on.

#### Attributes

- `lang` (optional, default: `de`): set to `de` or `en` for German or English
  - example `lang="de"`
- `entry-point-url` (optional, default is the TU Graz entry point url): entry point url to access the api
  - example `entry-point-url="https://api-dev.tugraz.at"`
- `auth` object: you need to set that object property for the auth token
  - example auth property: `{token: "THE_BEARER_TOKEN"}`
  - note: most often this should be an attribute that is not set directly, but subscribed at a provider
- `organization-id` (optional, default is the first in organisations list): id of the organisation library to which the user needs access rights.
  - example: `organization-id="681-F1490"`
- `book-offer-id`: id of the book to borrow
  - example: `book-offer-id="+F20313804"`

### dbp-library-shelving

You can use this activity to store the place (on the shelf) for a added/returned book. Each library office can only 
shelf books she/he manages. 

Note that you will need a Keycloak server along with a client id for the domain you are running this html on.

#### Attributes

- `lang` (optional, default: `de`): set to `de` or `en` for German or English
  - example `lang="de"`
- `entry-point-url` (optional, default is the TU Graz entry point url): entry point url to access the api
  - example `entry-point-url="https://api-dev.tugraz.at"`
- `auth` object: you need to set that object property for the auth token
  - example auth property: `{token: "THE_BEARER_TOKEN"}`
  - note: most often this should be an attribute that is not set directly, but subscribed at a provider
- `organization-id` (optional, default is the first in organisations list): id of the organisation library to which the user needs access rights.
  - example: `organization-id="681-F1490"`
- `book-offer-id`: id of the book to borrow
  - example: `book-offer-id="+F20313804"`

## "dbp-library" Slots

These are common slots for the appshell. You can find the documentation of these slot in the `README.md` of the appshell webcomponent.

## Design Note

To ensure a uniform and responsive design the activity should occupy 100% of the window width when the activity width is less than 768 px.

## Mandatory attributes

If you are not using the `provider-root` attribute to "terminate" all provider attributes
you need to manually add these attributes so that the topic will work properly:

```html
<dbp-library
    auth
    requested-login-status
    analytics-event
>
</dbp-library>
```
