import $ from 'jquery';
import * as utils from './utils.js';
import {i18n} from './i18n.js';
import {html} from 'lit-element';
import {send as notify} from 'vpu-notification';
import VPULitElementJQuery from 'vpu-common/vpu-lit-element-jquery';
import 'vpu-language-select';
import * as commonUtils from 'vpu-common/utils';
import suggestionsCSSPath from 'suggestions/dist/suggestions.css';
import bulmaCSSPath from 'bulma/css/bulma.min.css';

class LibraryRenewLoan extends VPULitElementJQuery {
    constructor() {
        super();
        this.lang = 'de';
        this.entryPointUrl = commonUtils.getAPiUrl();
        this.personId = "";
        this.person = null;
        this.loans = [];
    }

    static get properties() {
        return {
            lang: { type: String },
            entryPointUrl: { type: String, attribute: 'entry-point-url' },
            loans: { type: Object, attribute: false },
        };
    }

    connectedCallback() {
        super.connectedCallback();
        const that = this;

        this.updateComplete.then(()=>{
            const $personSelect = that.$('vpu-person-select');
            const $renewLoanBlock = that.$('#renew-loan-block');

            // check if the currently logged-in user has the role "ROLE_F_BIB_F" set
            window.addEventListener("vpu-auth-person-init", () => {
                if (!Array.isArray(window.VPUPerson.roles) || window.VPUPerson.roles.indexOf('ROLE_F_BIB_F') === -1) {
                    // TODO: implement overlay with error message, we currently cannot hide the form because select2 doesn't seem to initialize properly if the web-component is invisible
                    that.$('#permission-error-block').show();
                    that.$('form').hide();
                }
            });

            // show loan list block if person was selected
            $personSelect.change(function () {
                that.person = $(this).data("object");
                that.personId = that.person["@id"];
                const apiUrl = that.entryPointUrl + that.personId + "/library-book-loans";

                function BreakSignal() {}

                // load list of loans for person
                fetch(apiUrl, {
                    headers: {
                        'Content-Type': 'application/ld+json',
                        'Authorization': 'Bearer ' + window.VPUAuthToken,
                    },
                })
                .then((response) => {
                    if(!response.ok) {
                        console.log(response);
                        notify({
                            "summary": i18n.t('renew-loan.error-load-loans-summary'),
                            "body": response.statusText,
                            "type": "danger",
                        });

                        throw new BreakSignal();
                    } else {
                        return response.json();
                    }
                })
                .then((result) => {
                    if (result['hydra:totalItems'] === 0) {
                        notify({
                            "summary": i18n.t('renew-loan.error-no-existing-loans-summary'),
                            "body": i18n.t('renew-loan.error-no-existing-loans-body'),
                            "type": "warning",
                            "timeout": 5,
                        });
                    } else {
                        that.loans = result['hydra:member'];
                        console.log(that.loans);

                        $renewLoanBlock.show();
                    }
                })
                .catch(BreakSignal, () => {})
                .catch((error) => {
                    notify({
                        "summary": i18n.t('renew-loan.error-load-loans-summary'),
                        "body": error,
                        "type": "danger",
                    });
                });
            }).on('unselect', function (e) {
                $renewLoanBlock.hide();
            });
        });
    }

    update(changedProperties) {
        changedProperties.forEach((oldValue, propName) => {
            if (propName === "lang") {
                i18n.changeLanguage(this.lang);
            }
        });

        super.update(changedProperties);
    }

    onLanguageChanged(e) {
        this.lang = e.detail.lang;
    }

    /**
     * We need to strip the seconds and timezone for the datetime-local input
     *
     * @param isoDateTime
     * @returns {string}
     */
    static isoDT2DTL(isoDateTime) {
        const re = /(\d{4}-\d{2}-\d{2}T\d{2}:\d{2})/;
        const result = re.exec(isoDateTime);
        return result[1];
    }

    execRenew(e) {
        e.preventDefault();

        const tr = e.path[2];
        const dateTimeSelect = tr.querySelector("input[type='datetime-local']");
        const loanId = tr.getAttribute("data-id");

        const date = new Date(dateTimeSelect.value);
        const data = {"endTime": date.toISOString()};

        const apiUrl = this.entryPointUrl + loanId;

        function BreakSignal() {}

        // update loan
        fetch(apiUrl, {
            method: 'PUT',
            body: JSON.stringify(data),
            headers: {
                'Content-Type': 'application/ld+json',
                'Authorization': 'Bearer ' + window.VPUAuthToken,
            },
        })
            .then((response) => {
                if(!response.ok) {
                    console.log(response);
                    notify({
                        "summary": i18n.t('renew-loan.error-renew-loan-summary'),
                        "body": response.statusText,
                        "type": "danger",
                    });

                    throw new BreakSignal();
                } else {
                    return response.json();
                }
            })
            .catch(BreakSignal, () => {})
            .then((loan) => {
                console.log(loan);

                notify({
                    "summary": i18n.t('renew-loan.info-renew-loan-success-summary'),
                    "body": i18n.t('renew-loan.info-renew-loan-success-body'),
                    "type": "info",
                    "timeout": 5,
                });
            })
            .catch((error) => {
                notify({
                    "summary": i18n.t('renew-loan.error-renew-loan-summary'),
                    "body": error,
                    "type": "danger",
                });
            });
    }

    render() {
        const suggestionsCSS = utils.getAssetURL(suggestionsCSSPath);
        const bulmaCSS = utils.getAssetURL(bulmaCSSPath);
        const minDate = new Date().toISOString();

        return html`
            <link rel="stylesheet" href="${bulmaCSS}">
            <link rel="stylesheet" href="${suggestionsCSS}">
            <style>
                #renew-loan-block, #permission-error-block { display: none; }
                #renew-loan-block input { width: 100%; }
                .tile.is-ancestor .tile {margin: 10px;}
                form {width: 100%};
            </style>

            <section class="section">
                <div class="container">
                    <h1 class="title">${i18n.t('renew-loan.title')}</h1>
                    <h2 class="subtitle">${i18n.t('renew-loan.subtitle')}</h2>
                </div>
            </section>
            <section class="section">
                <div class="container">
                    <div class="tile is-ancestor">
                        <div class="tile">
                            <form>
                                <div class="field">
                                    <label class="label">${i18n.t('person-select.headline')}</label>
                                    <div class="control">
                                        <vpu-person-select entry-point-url="${this.entryPointUrl}" lang="${this.lang}"></vpu-person-select>
                                    </div>
                                </div>
                                <div id="renew-loan-block">
                                    <table class="table">
                                        <thead>
                                            <tr>
                                                <th>${i18n.t('renew-loan.book')}</th>
                                                <th>${i18n.t('renew-loan.end-date')}</th>
                                                <th></th>
                                            </tr>
                                        </thead>
                                        ${this.loans.map((loan) => html`
                                        <tr data-id="${loan['@id']}">
                                            <td>${loan.object.name}</td>
                                            <td><input type="datetime-local" name="endTime" min="${LibraryRenewLoan.isoDT2DTL(minDate)}" value="${LibraryRenewLoan.isoDT2DTL(loan.endTime)}"></td>
                                            <td><button @click="${(e) => this.execRenew(e)}" class="button is-link is-small" id="send" title="${i18n.t('renew-loan.renew-loan')}">Ok</button></td>
                                        </tr>
                                        `)}
                                    </table>
                                </div>
                            </form>
                            <div class="notification is-danger" id="permission-error-block">
                                ${i18n.t('error-permission-message')}
                            </div>
                        </div>
                        <div class="tile">
                            <vpu-knowledge-base-web-page-element-view entry-point-url="${this.entryPointUrl}" lang="${this.lang}" value="bedienstete/bibliothek/buch-ausleihen" text="${i18n.t('more-information')}"></vpu-knowledge-base-web-page-element-view>
                        </div>
                    </div>
                </div>
            </section>
        `;
    }
}

commonUtils.defineCustomElement('vpu-library-renew-loan', LibraryRenewLoan);
