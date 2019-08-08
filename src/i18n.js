import i18next from 'i18next';

import de from './i18n/de/translation.json';
import en from './i18n/en/translation.json';

/**
 * Like Intl.DateTimeFormat().format() but uses the current language as locale.
 *
 * @param {i18next.i18n} i18n - The i18next instance
 * @param {Date} date - The date to format
 * @param options - Options passed to Intl.DateTimeFormat
 * @returns {string}
 */
export function dateTimeFormat(i18n, date, options) {
    return new Intl.DateTimeFormat(i18n.languages, options).format(date);
}

/**
 * Like Intl.NumberFormat().format() but uses the current language as locale.
 *
 * @param {i18next.i18n} i18n - The i18next instance
 * @param {Number} number - The number to format
 * @param {Object} options - Options passed to Intl.NumberFormat
 * @returns {string}
 */
export function numberFormat(i18n, number, options) {
    return new Intl.NumberFormat(i18n.languages, options).format(number);
}

/**
 * Creates a new i18next instance that is fully initialized.
 *
 * Call changeLanguage() on the returned object to change the language.
 *
 * @param {Object} languages - Mapping from languages to translation objects
 * @param {string} lng - The default language
 * @returns {i18next.i18n}
 */
export function createInstance(languages, lng) {
    var options = {
        lng: lng,
        fallbackLng: [],
        debug: false,
        initImmediate: false, // Don't init async
        resources: {},
    };

    Object.keys(languages).forEach(function(key) {
        options['resources'][key] = {translation: languages[key]};
    });

    var i18n = i18next.createInstance();
    i18n.init(options);
    console.assert(i18n.isInitialized);

    return i18n;
}

export const i18n = createInstance({en: en, de: de}, 'de');