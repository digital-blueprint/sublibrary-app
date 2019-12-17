import {createInstance} from 'vpu-common/i18next.js';

import de from './i18n/de/translation.json';
import en from './i18n/en/translation.json';

export function createI18nInstance () {
    return createInstance({en: en, de: de}, 'de', 'en');
}