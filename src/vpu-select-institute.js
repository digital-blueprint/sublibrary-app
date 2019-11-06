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
import JSONLD from "vpu-common/jsonld";

select2(window, $);

class SelectInstitute extends VPULitElementJQuery {
    constructor() {
        super();
        this.lang = 'de';
        this.entryPointUrl = commonUtils.getAPiUrl();
        this.jsonld = null;
        this.$select = null;
        this.institutes = [];
        this.institute = null;
        // For some reason using the same ID on the whole page twice breaks select2 (regardless if they are in different custom elements)
        this.selectId = 'select-institute-' + commonUtils.makeId(24);
    }

    static get properties() {
        return {
            lang: {type: String},
            entryPointUrl: { type: String, attribute: 'entry-point-url' },
            institutes: {type: Array, attribute: false},
            institute: {type: Object, attribute: false},
        }
    }

    connectedCallback() {
        super.connectedCallback();

        this.updateComplete.then(()=> {
            this.$select = this.$('#' + this.selectId);

            window.addEventListener("vpu-auth-person-init", async () => {
                this.initSelect2();
            });
        });
    }

    async load_institutes() {
        this.institutes = await this.getAssosiatedInstitutes();
        if (this.institute === null) {
            this.institute = this.institutes.length > 0 ? this.institutes[0] : null;
        } else {
            this.institute = this.institutes.find((institute) => { return institute.id === this.institute.id; });
        }

        window.VPUPersonLibrary = this.institute;
    }

    async initSelect2() {
        const that = this;

        if (this.$select === null) {
            return false;
        }

        // we need to destroy Select2 and remove the event listeners before we can initialize it again
        if (this.$select && this.$select.hasClass('select2-hidden-accessible')) {
            this.$select.css('visibility', 'hidden');
            this.$select.off('select2:select');
            this.$select.empty().trigger('change');
            this.$select.select2('destroy');
        }

        await this.load_institutes();

        this.$select.select2({
            width: '100%',
            language: this.lang === "de" ? select2LangDe() : select2LangEn(),
            placeholderOption: i18n.t('select-institute.placeholder'),
            dropdownParent: this.$('#select-institute-dropdown'),
            data: this.institutes.map((item) => {
                return {'id': item.id, 'text': item.code + ' ' + item.name};
            }),
        }).on("select2:select", function () {
            if (that.$select ) {
                that.institute = that.institutes.find(function(item) {
                    return item.id === that.$select.select2('data')[0].id;
                });

                // fire a change event
                that.dispatchEvent(new CustomEvent('change', {
                    detail: {
                        value: that.institute.code,
                    },
                    bubbles: true
                }));

                window.VPUPersonLibrary = that.institute;
                console.log('vpu-institute-select: window.VPUPersonLibrary.code = ' + window.VPUPersonLibrary.code);
            }
        });

        if (this.institute !== null) {
            this.$select.val(this.institute.id).trigger('change');
            this.$select.css('visibility', 'visible');
        }
        return true;
    }

    update(changedProperties) {
        changedProperties.forEach((oldValue, propName) => {
            switch (propName) {
                case "lang":
                    i18n.changeLanguage(this.lang);

                    this.initSelect2();
                    break;
                case "entryPointUrl":
                    const that = this;

                    JSONLD.initialize(this.entryPointUrl, function (jsonld) {
                        that.jsonld = jsonld;
                    }, {}, that.lang);
                    break;
                default:
            }
        });

        super.update(changedProperties);
    }

    /**
     * Returns the list of assigned libraries of the current user
     *
     * @returns {Array}
     */
    async getAssosiatedInstitutes() {
        if (window.VPUPerson === undefined) {
            return [];
        }

        const functions = window.VPUPerson.functions;

        if (functions === undefined) {
            return [];
        }

        const re = /^F_BIB:F:(\d+):(\d+)$/;
        let results = [];

        for (const item of functions) {
            const matches = re.exec(item);

            if (matches !== null) {
                const orgId = matches[2];
                const apiUrl = this.entryPointUrl + '/organizations/knowledge_base_organizations/' + orgId + '?lang=' + this.lang;

                // load organisations
                const response = await fetch(apiUrl, {
                    headers: {
                        'Content-Type': 'application/ld+json',
                        'Authorization': 'Bearer ' + window.VPUAuthToken,
                    },
                });
                const org = await response.json();
                const institute = {
                    id: matches[2],
                    code: org.alternateName,
                    name: org.name,
                    url: org.url,
                };
                results.push( institute );
            }
        }

        return results;
    };

    static get styles() {
        // language=css
        return css`
            ${commonStyles.getThemeCSS()}
            ${commonStyles.getGeneralCSS()}
            ${commonStyles.getNotificationCSS()}

            .select2-dropdown {
                border-radius: var(--vpu-border-radius);
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
                <select id="${this.selectId}" name="select-institute" class="select" style="visibility: hidden;"></select>
            </div>
            <div id="select-institute-dropdown"></div>
        </div>

        `;
    }
}

commonUtils.defineCustomElement('vpu-select-institute', SelectInstitute);
