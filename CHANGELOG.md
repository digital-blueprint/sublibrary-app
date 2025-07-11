# Changelog

## Unreleased

- Update PersonSelect from toolkit and adapt: no custom derivation of PersonSelect required anymore

## 2.2.3

- New optional extended application layout for wider screens
- book list: show freeform publication date text if possible instead of just the
  year. Sorting is using the oldest year in the freeform text.

## 2.2.2

- Minor theme fixes for the dark mode
- Fix buttons in list rows for books which contained special characters

## 2.2.1

- Fix the loan extension list being cut off after 30 entries, even if more loans exist.
- Remove unsafe-eval from the CSP, no longer needed with recent Keycloak
- Improved application metadata
- Port to eslint 9

## 2.2.0

- Adjust for bundle API changes (PUT -> PATCH)

## 2.1.0

- Various dependency updates
- Use new includeLocal API for displaying the email addresses in the person
  select and other places. This should fix the issue with the email addresses
  not being visible with the new version of the sublibrary bundle, as well as
  the "email send" button no longer working.
- Stop depending on JSON-LD metadata of the API, just use hard coded paths and
  attributes instead.
- Fix suggestion popup for the book location input not being shown.
- Various minor fixes for unhandled JS errors in some edge cases.
