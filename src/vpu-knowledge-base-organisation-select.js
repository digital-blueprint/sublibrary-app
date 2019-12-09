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
import {send as notify} from "vpu-common/notification";

select2(window, $);

class VPUKnowledgeBaseOrganizationSelect extends VPULitElementJQuery {
    constructor() {
        super();
        this.lang = 'de';
        this.entryPointUrl = commonUtils.getAPiUrl();
        this.jsonld = null;
        this.$select = null;
        this.organizations = [];
        this.organization = null;
        // For some reason using the same ID on the whole page twice breaks select2 (regardless if they are in different custom elements)
        this.selectId = 'select-organization-' + commonUtils.makeId(24);
        this.cache = { en: [], de: [] };
        this.value = '';
    }

    static get properties() {
        return {
            lang: {type: String},
            entryPointUrl: { type: String, attribute: 'entry-point-url' },
            organizations: {type: Array, attribute: false},
            organization: {type: Object, attribute: false},
            value: { type: String },
        }
    }

    select2IsInitialized() {
        return this.$select !== null && this.$select.hasClass("select2-hidden-accessible");
    }

    connectedCallback() {
        super.connectedCallback();

        this.updateComplete.then(()=> {
            this.$select = this.$('#' + this.selectId);
            this.setFirstOrganization();

            window.addEventListener("vpu-auth-person-init", async () => {
                this.cache = { en: [], de: [] };
                this.initSelect2();
            });

            // close the selector on blur of the web component
            $(this).blur(() => {
                // the 500ms delay is a workaround to actually get an item selected when clicking on it,
                // because the blur gets also fired when clicking in the selector
                setTimeout(() => {
                    if (this.select2IsInitialized()) {
                        this.$select.select2('close');
                    }
                }, 500);
            });
        });
    }

    async load_organizations() {
        if (this.cache[this.lang].length === 0) {
            this.cache[this.lang] = await this.getAssociatedOrganizations();
        }
        this.organizations = this.cache[this.lang];

        if (this.organization === null || this.organization === undefined) {
            this.setFirstOrganization();
        } else {
            const old_organization = this.organization;
            // get organization with all attributes
            this.organization = this.organizations.find((organization) => {
                return organization.id === this.organization.id;
            });
            this.setDataObject();
            if (old_organization.name === '') {
                this.fireEvent('init')
            } else {
                this.fireEvent('change')
            }
        }
    }

    async initSelect2() {
        const that = this;

        if (this.$select === null) {
            return false;
        }

        // we need to destroy Select2 and remove the event listeners before we can initialize it again
        if (this.select2IsInitialized()) {
            this.$select.off('select2:select');
            this.$select.empty().trigger('change');
            this.$select.select2('destroy');
        }

        await this.load_organizations();

        if (this.organization !== null) {

            this.$select.select2({
                width: '100%',
                language: this.lang === "de" ? select2LangDe() : select2LangEn(),
                placeholderOption: i18n.t('select-organization.placeholder'),
                dropdownParent: this.$('#select-organization-dropdown'),
                data: this.organizations.map((item) => {
                    return {'id': item.id, 'text': item.code + ' ' + item.name};
                }),
                sorter: function(data) {
                    return data.sort(function(a, b) {
                        return a.text < b.text ? -1 : a.text > b.text ? 1 : 0;
                    });
                }
            }).on("select2:select", function () {
                if (that.$select ) {
                    that.organization = that.organizations.find(function(item) {
                        return item.id === that.$select.select2('data')[0].id;
                    });

                    that.setDataObject();
                    that.fireEvent("change");
                }
            });

            this.$select.val(this.organization.id).trigger('change');
        }
        return true;
    }

    setDataObject() {
        if (!this.organization || !this.organization.object) {
            return;
        }
        const $this = $(this);
        $this.attr("data-object", JSON.stringify(this.organization.object));
        $this.data("object", this.organization.object);
    }

    fireEvent(eventName) {
        if (!this.organization) {
            return;
        }
        // console.log('fireEvent() eventName = ' + eventName + ' organization:');
        // console.dir(this.organization);

        const event = new CustomEvent(eventName, {
            bubbles: true,
            composed: true,
            detail: {
                'value': this.organization.value,
                'object': this.organization.object,
            }
        });
        this.dispatchEvent(event);
    }

    update(changedProperties) {
        changedProperties.forEach((oldValue, propName) => {
            switch (propName) {
                case "lang":
                    i18n.changeLanguage(this.lang);

                    this.initSelect2();
                    break;
                case "value":
                    const matches = this.value.match(/\/\d+$/);
                    if (matches !== null) {
                        this.organization = this.organizations.find((organization) => {
                            return organization.id === matches[1];
                        });
                    }
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

    getMinimalOrganization(id, orgUnitCode) {
        return {
            id: id,
                code: 'F' + orgUnitCode,
            name: '',
            url: '',
            value: '/organizations/knowledge_base_organizations/' + id,
            object: {
                "@context": {
                    "@vocab": this.entryPointUrl + "/docs.jsonld#",
                        "hydra": "http://www.w3.org/ns/hydra/core#",
                        "identifier": "KnowledgeBaseOrganization/identifier",
                        "name": "https://schema.org/name",
                        "alternateName": "https://schema.org/alternateName",
                        "url": "https://schema.org/url"
                },
                "@id": "/organizations/knowledge_base_organizations/" + id,
                    "@type": "http://schema.org/Organization",
                    "identifier": id,
                    "name": '',
                    "url": '',
                    "alternateName": 'F' + orgUnitCode,
            }
        };
    }

    setFirstOrganization() {
         if (window.VPUPerson === undefined) {
             // console.log('setFirstOrganization(): window.VPUPerson === undefined');
             return;
         }

         const functions = window.VPUPerson.functions;

         if (functions === undefined) {
             // console.log('setFirstOrganization(): functions === undefined');
             return;
         }

        const organizationId = sessionStorage.getItem('vpu-organization-id');
        if (organizationId !== null) {
             this.organization = this.organizations.find(function(item) {
                 return item.value === organizationId;
             });

             this.setDataObject();
             this.fireEvent("pre-init");

             return;
         }

         const re = /^F_BIB:F:(\d+):(\d+)$/;
         for (const item of functions) {
             const matches = re.exec(item);

             if (matches !== null) {
                 const id = matches[2] + '-F' + matches[1];
                 this.organization = this.getMinimalOrganization(id, matches[1]);
                 this.setDataObject();
                 this.fireEvent("pre-init");
                 break;
             }
         }
         // console.log('setFirstOrganization():');
         // console.dir(this.organization);
    }

    /**
     * Returns the list of assigned libraries of the current user
     *
     * @returns {Array}
     */
    async getAssociatedOrganizations() {
        if (window.VPUPerson === undefined) {
            return [];
        }

        const functions = window.VPUPerson.functions;

        if (functions === undefined) {
            return [];
        }

        // we also allow "_" in the id for example for the special id 1226_1231
        const re = /^F_BIB:F:(\d+):([\d_]+)$/;
        let results = [];
        let promises = [];

        for (const item of functions) {
            const matches = re.exec(item);

            if (matches !== null) {
                const identifier = matches[2] + '-F' + matches[1];
                const apiUrl = this.entryPointUrl + '/organizations/knowledge_base_organizations/' + identifier + '?lang=' + this.lang;

                // load organisations
                promises.push(fetch(apiUrl, {
                    headers: {
                        'Content-Type': 'application/ld+json',
                        'Authorization': 'Bearer ' + window.VPUAuthToken,
                    },
                })
                    .then(response => response.json())
                    .then(org => {
                        if (org['@type'] !== 'hydra:Error') {
                            const organization = {
                                id: org.identifier,
                                code: org.alternateName,
                                name: org.name,
                                url: org.url,
                                value: org['@id'],
                                object: org,
                            };
                            results.push(organization);
                        } else {
                            const organization = this.getMinimalOrganization(identifier, matches[1]);
                            results.push(organization);
                            notify({
                                "summary": i18n.t('select-organization.load-error'),
                                "icon": "sad",
                                "body": org["hydra:description"],
                                "type": "danger",
                            });
                        }
                    })
                );
            }
        }

        await Promise.all(promises);
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

            .notification > img {
                filter: invert(100%);
                width: 24px;
                color: blue;
            }
        `;
    }

    render() {
        commonUtils.initAssetBaseURL('vpu-select-organization-src');
        const select2CSS = commonUtils.getAssetURL(select2CSSPath);
        return html`
            <link rel="stylesheet" href="${select2CSS}">

        <div class="select">
            <div class="select2-control control">
                <!-- https://select2.org-->
                <select id="${this.selectId}" name="select-organization" class="select" style="visibility: hidden;"></select>
            </div>
            <div id="select-organization-dropdown"></div>
        </div>

        `;
    }
}

commonUtils.defineCustomElement('vpu-knowledge-base-organization-select', VPUKnowledgeBaseOrganizationSelect);
