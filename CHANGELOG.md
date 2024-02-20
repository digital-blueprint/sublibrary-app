# Changelog

## 2.1.0

* Various dependency updates
* Use new includeLocal API for displaying the email addresses in the person
  select and other places. This should fix the issue with the email addresses
  not being visible with the new version of the sublibrary bundle, as well as
  the "email send" button no longer working.
* Stop depending on JSON-LD metadata of the API, just use hard coded paths and
  attributes instead.
* Fix suggestion popup for the book location input not being shown.
* Various minor fixes for unhandled JS errors in some edge cases.
