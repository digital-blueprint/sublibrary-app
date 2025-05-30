import '@webcomponents/scoped-custom-element-registry';
import {AppShell} from '@dbp-toolkit/app-shell';
import * as commonUtils from '@dbp-toolkit/common/utils';
import {Translated} from '@dbp-toolkit/common/src/translated';

commonUtils.defineCustomElement('dbp-sublibrary', AppShell);
commonUtils.defineCustomElement('dbp-translated', Translated);

console.log(
    '# Example book barcodes\n\n' +
        '## F1490\n+F20313804, +F24048209, +F24084706\n\n' +
        '## F2050\n+F21910103, +F36418703, +F34286303, +F47148902, +F2750200X, +F27006305, +F8160107\n\n' +
        '## F2190\n+F5439740X, +F47139202, +F26813604, +F43692000, +F48530609, +F24978201, +F9301604',
);
