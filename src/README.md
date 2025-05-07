# Sublibrary activities

Here you can find the individual activities of the `sublibrary` app. If you want to use the whole app look at [sublibrary](https://github.com/digital-blueprint/sublibrary-app).

## Usage of an activity

You can use every activity alone. Take a look at our examples [here](https://github.com/digital-blueprint/sublibrary-app/tree/main/examples).

## Activities

### Shared Attributes

These attributes are available for all activities listed here:

- `lang` (optional, default: `de`): set to `de` or `en` for German or English
    - example `lang="de"`
- `entry-point-url` (optional, default is the TU Graz entry point url): entry point url to access the api
    - example `entry-point-url="https://api-dev.tugraz.at"`
- `auth` object: you need to set that object property for the auth token
    - example auth property: `{token: "THE_BEARER_TOKEN"}`
    - note: most often this should be an attribute that is not set directly, but subscribed at a provider
- `organization-id` (optional, default is the first in organisations list): id of the organisation library to which the user needs access rights.
    - example: `organization-id="1190-F2050"`

### dbp-sublibrary-book-list

You can use this activity to list all books for an organisation. You cal also filter
the list by location and/or by inventory year.

Note that you will need a Keycloak server along with a client id for the domain you are running this html on.

#### Attributes

See [shared attributes](#shared-attributes).

### dbp-sublibrary-budget

You can use this activity to retrieve the budget for an organisation library.

Note that you will need a Keycloak server along with a client id for the domain you are running this html on.

#### Attributes

See [shared attributes](#shared-attributes).

### dbp-sublibrary-create-loan

You can use this activity to

Note that you will need a Keycloak server along with a client id for the domain you are running this html on.

#### Attributes

- `book-offer-id`: id of the book to borrow
    - example: `book-offer-id="+F20313804"`
- `person-id`: id of the person to borrow the book
    - example: `person-id="demo1dbp"`

### dbp-sublibrary-loan-list

You can use this activity to all loans for an organisation library.

Note that you will need a Keycloak server along with a client id for the domain you are running this html on.

#### Attributes

See [shared attributes](#shared-attributes).

### dbp-sublibrary-order-list

You can use this activity to list the orders for an organisation library.

Note that you will need a Keycloak server along with a client id for the domain you are running this html on.

#### Attributes

See [shared attributes](#shared-attributes).

### dbp-sublibrary-renew-loan

You can use this activity to list all loans a person has. The organisation is used as a filter (so each library officer
sees only loans for books he/she has to manage).

Note that you will need a Keycloak server along with a client id for the domain you are running this html on.

#### Attributes

- `person-id`: id of the person to borrow the book
    - example: `person-id="demo1dbp"`

### dbp-sublibrary-return-book

You can use this activity to return a borrowed book. Each library office can only accept books from the library he/she
manages.

Note that you will need a Keycloak server along with a client id for the domain you are running this html on.

#### Attributes

- `book-offer-id`: id of the book to borrow
    - example: `book-offer-id="+F20313804"`

### dbp-sublibrary-shelving

You can use this activity to store the place (on the shelf) for an added/returned book. Each library office can only
shelf books she/he manages.

Note that you will need a Keycloak server along with a client id for the domain you are running this html on.

#### Attributes

- `book-offer-id`: id of the book to borrow
    - example: `book-offer-id="+F20313804"`

## Design Note

To ensure a uniform and responsive design these activities should occupy 100% width of the window when the activities' width are under 768 px.

## Mandatory attributes

If you are not using the `provider-root` attribute to "terminate" all provider attributes
you need to manually add these attributes so that the topic will work properly:

```html
<dbp-sublibrary auth requested-login-status analytics-event> </dbp-sublibrary>
```
