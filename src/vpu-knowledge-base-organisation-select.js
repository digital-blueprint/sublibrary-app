import $ from 'jquery';
import select2 from 'select2';
import select2CSSPath from 'select2/dist/css/select2.min.css';
import {createI18nInstance} from './i18n.js';
import {css, html, LitElement} from 'lit-element';
import * as commonUtils from 'vpu-common/utils';
import * as commonStyles from 'vpu-common/styles';
import select2LangDe from "vpu-person-select/src/i18n/de/select2";
import select2LangEn from "vpu-person-select/src/i18n/en/select2";
import JSONLD from "vpu-common/jsonld";
import {send as notify} from "vpu-common/notification";

select2(window, $);

const i18n = createI18nInstance();

class VPUKnowledgeBaseOrganizationSelect extends LitElement {
    constructor() {
        super();
        this.lang = i18n.language;
        this.entryPointUrl = commonUtils.getAPiUrl();
        this.jsonld = null;
        this.organizations = [];
        // For some reason using the same ID on the whole page twice breaks select2 (regardless if they are in different custom elements)
        this.selectId = 'select-organization-' + commonUtils.makeId(24);
        this.cache = { en: [], de: [] };
        this.value = '';
    }

    static get properties() {
        return {
            lang: {type: String},
            entryPointUrl: { type: String, attribute: 'entry-point-url' },
            value: {type: String, reflect: true}
        };
    }

    $(selector) {
        return $(this.shadowRoot.querySelector(selector));
    }

    select2IsInitialized(elm) {
        return elm !== null && elm.hasClass("select2-hidden-accessible");
    }

    connectedCallback() {
        super.connectedCallback();

        this.updateComplete.then(()=> {
            window.addEventListener("vpu-auth-person-init", async () => {
                this.cache = { en: [], de: [] };
                this.updateSelect2();
            });

            // close the selector on blur of the web component
            $(this).blur(() => {
                // the 500ms delay is a workaround to actually get an item selected when clicking on it,
                // because the blur gets also fired when clicking in the selector
                setTimeout(() => {
                    const $select = this.$('#' + this.selectId);
                    if (this.select2IsInitialized($select)) {
                        $select.select2('close');
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
    }

    async updateSelect2() {
        await this.updateComplete;

        const $select = this.$('#' + this.selectId);
        console.assert($select.length, "select2 missing");

        // we need to destroy Select2 and remove the event listeners before we can initialize it again
        if (this.select2IsInitialized($select)) {
            $select.off('select2:select');
            $select.empty().trigger('change');
            $select.select2('destroy');
        }

        await this.load_organizations();

        const data = this.organizations.map((item) => {
            return {'id': item.object["@id"], 'text': item.code + ' ' + item.name};
        });

        data.sort((a, b) => {
            return a.text < b.text ? -1 : a.text > b.text ? 1 : 0;
        });

        $select.select2({
            width: '100%',
            language: this.lang === "de" ? select2LangDe() : select2LangEn(),
            placeholderOption: i18n.t('select-organization.placeholder'),
            dropdownParent: this.$('#select-organization-dropdown'),
            data: data
        }).on("select2:select", () => {
            const selectedId = $select.select2('data')[0].id;
            this.value = selectedId;
        });

        // If none is selected, default to the first one
        if (!this.value.length && data.length) {
            this.value = data[0].id;
        }

        // Apply the selection
        $select.val(this.value).trigger('change');

        if (this.organizations.length === 0)
            $select.next().hide();
    }

    fireEvent() {
        const organization = this.organizations.find((item) => {
            return item.object["@id"] === this.value;
        });

        const $this = $(this);

        if (organization === undefined) {
            $this.attr("data-object", null);
            $this.data("object", null);
            return;
        }

        $this.attr("data-object", JSON.stringify(organization.object));
        $this.data("object", organization.object);

        const event = new CustomEvent('change', {
            bubbles: true,
            composed: true,
            detail: {
                'value': organization.value,
                'object': organization.object,
            }
        });
        this.dispatchEvent(event);
    }

    update(changedProperties) {
        changedProperties.forEach((oldValue, propName) => {
            switch (propName) {
                case "lang":
                    i18n.changeLanguage(this.lang);
                    this.updateSelect2();
                    break;
                case "value": {
                    this.updateSelect2();
                    this.fireEvent();
                    break;
                }
                case "entryPointUrl":
                    JSONLD.initialize(this.entryPointUrl, (jsonld) => {
                        this.jsonld = jsonld;
                    }, {}, this.lang);
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

    /**
     * Returns the list of assigned libraries of the current user
     *
     * @returns {Array} list of orga objects
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
    }

    static get styles() {
        // language=css
        return css`
            ${commonStyles.getThemeCSS()}
            ${commonStyles.getGeneralCSS()}
            ${commonStyles.getNotificationCSS()}
            ${commonStyles.getSelect2CSS()}
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
