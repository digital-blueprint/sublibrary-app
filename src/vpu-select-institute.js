import $ from 'jquery';
import select2 from 'select2';
import select2CSSPath from 'select2/dist/css/select2.min.css';
import {i18n} from './i18n.js';
import {css, html} from 'lit-element';
import * as commonUtils from 'vpu-common/utils';
import * as commonStyles from 'vpu-common/styles';
import select2LangDe from "vpu-person-select/src/i18n/de/select2";
import select2LangEn from "vpu-person-select/src/i18n/en/select2";
import VPULitElementJQuery from "vpu-common/vpu-lit-element-jquery";

select2(window, $);

class SelectInstitute extends VPULitElementJQuery {
    constructor() {
        super();
        this.lang = 'de';
        this.$select = null;
        this.institutes = [];
        this.institute = 0;
        // For some reason using the same ID on the whole page twice breaks select2 (regardless if they are in different custom elements)
        this.selectId = 'select-institute-' + commonUtils.makeId(24);
    }

    static get properties() {
        return {
            lang: {type: String},
            institutes: {type: Array, attribute: false},
            institute: {type: String, attribute: false},
        }
    }

    connectedCallback() {
        super.connectedCallback();

        this.updateComplete.then(()=> {
            this.$select = this.$('#' + this.selectId);

            // close the selector on blur of the web component
            // $(this).blur(() => {
            //     // the 500ms delay is a workaround to actually get an item selected when clicking on it,
            //     // because the blur gets also fired when clicking in the selector
            //     setTimeout(() => {
            //         if (this.select2IsInitialized()) {
            //             this.$select.select2('close');
            //         }
            //     }, 500);
            // });

            window.addEventListener("vpu-auth-person-init", () => {
                this.institutes = this.getAssosiatedInstitutes();
                this.institute = this.institutes.length > 0 ? this.institutes[0] : '';
                window.VPUPersonLibrary = this.institute;
                console.log('(init) window.VPUPersonLibrary = ' + window.VPUPersonLibrary);
                this.initSelect2();
            });
        });
    }

    initSelect2(ignorePreset = false) {
        const that = this;
        const $this = $(this);

        if (this.$select === null) {
            return false;
        }

        // we need to destroy Select2 and remove the event listeners before we can initialize it again
        if (this.$select && this.$select.hasClass('select2-hidden-accessible')) {
            this.$select.select2('destroy');
            this.$select.off('select2:select');
            this.$select.off('select2:closing');
        }

        this.$select.select2({
            width: '100%',
            language: this.lang === "de" ? select2LangDe() : select2LangEn(),
            placeholderOption: 'select an institute', //i18n.t('no institute found'),
            dropdownParent: this._('#select-institute-dropdown'),
            data: this.institutes.map((item, id) => { return {'id': item, 'text': item}; }),
        }).on("select2:select", function (e) {
            //debugger
            if (that.$select ) {
                that.institute = that.$select.select2('data')[0].text;
                window.VPUPersonLibrary = that.institute;
                console.log('(change) window.VPUPersonLibrary = ' + window.VPUPersonLibrary);
            }
        });

        this.$select.css('visibility', 'visible');
        return true;
    }

    select2IsInitialized() {
        return this.$select !== null && this.$select.hasClass("select2-hidden-accessible");
    }

    update(changedProperties) {
        changedProperties.forEach((oldValue, propName) => {
            if (propName === "lang") {
                i18n.changeLanguage(this.lang);
                if (this.select2IsInitialized()) {
                    // no other way to set an other language at runtime did work
                    this.initSelect2(true);
                }
            }
        });

        super.update(changedProperties);
    }

    static get styles() {
        // language=css
        return css`
            ${commonStyles.getThemeCSS()}
            ${commonStyles.getGeneralCSS()}
            ${commonStyles.getNotificationCSS()}
            
            .select2-control.control {
                width: 75%;
            }

            .select2-dropdown {
                border-radius: var(--vpu-border-radius);
                background: white;
            }

            .select2-container--default .select2-selection--single {
                border-radius: var(--vpu-border-radius);
            }

            .select2-container--default .select2-selection--single .select2-selection__rendered {
                color: inherit;
            }
            
        `;
    }

    render() {
        commonUtils.initAssetBaseURL('vpu-select-institute-src');
        const select2CSS = commonUtils.getAssetURL(select2CSSPath);
        return html`
            <link rel="stylesheet" href="${select2CSS}">

        <div class="select">
            <div class="select2-control control">
                <!-- https://select2.org-->
                <select id="${this.selectId}" name="select-institute" class="select" style="visibility: hidden;">
            </div>
            <div id="select-institute-dropdown"></div>
        </div>

        `;
    }

    /**
     * Returns the list of assigned libraries of the current user
     *
     * @returns {Array}
     */
    getAssosiatedInstitutes() {
        if (window.VPUPerson === undefined) {
            return [];
        }

        const functions = window.VPUPerson.functions;

        if (functions === undefined) {
            return [];
        }

        const re = /^F_BIB:F:(\d+):\d+$/;
        let results = [];

        for (const item of functions) {
            const matches = re.exec(item);

            if (matches !== null) {
                results.push("F" + matches[1]);
            }
        }

        return results;
    };

}

commonUtils.defineCustomElement('vpu-select-institute', SelectInstitute);
