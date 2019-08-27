import $ from 'jquery';
import * as utils from './utils.js';
import {i18n} from './i18n.js';
import {css, html} from 'lit-element';
import {send as notify} from 'vpu-notification';
import VPULitElementJQuery from 'vpu-common/vpu-lit-element-jquery';
import 'vpu-language-select';
import * as commonUtils from 'vpu-common/utils';
import suggestionsCSSPath from 'suggestions/dist/suggestions.css';
import bulmaCSSPath from 'bulma/css/bulma.min.css';

class LibraryCreateLoan extends VPULitElementJQuery {
    constructor() {
        super();
        this.lang = 'de';
        this.entryPointUrl = commonUtils.getAPiUrl();
        this.bookOfferId = "";
        this.bookOffer = null;
        this.personId = "";
        this.person = null;
    }

    static get properties() {
        return {
            lang: { type: String },
            entryPointUrl: { type: String, attribute: 'entry-point-url' },
        };
    }

    connectedCallback() {
        super.connectedCallback();
        const that = this;

        this.updateComplete.then(()=>{
            const $personSelect = that.$('vpu-person-select');
            const $bookOfferSelect = that.$('vpu-library-book-offer-select');
            const $createLoanBlock = that.$('#create-loan-block');

            // check if the currently logged-in user has the role "ROLE_F_BIB_F" set
            window.addEventListener("vpu-auth-person-init", () => {
                that.$('#login-error-block').hide();
                that._('form').classList.remove("hidden");

                if (!Array.isArray(window.VPUPerson.roles) || window.VPUPerson.roles.indexOf('ROLE_F_BIB_F') === -1) {
                    // TODO: implement overlay with error message, we currently cannot hide the form because select2 doesn't seem to initialize properly if the web-component is invisible
                    that.$('#permission-error-block').show();
                    that.$('form').hide();
                }
            });

            $personSelect.change(function () {
                that.person = $(this).data("object");
                that.personId = that.person["@id"];
                that.updateSubmitButtonDisabled();
            });

            // show create loan block if book offer was selected
            $bookOfferSelect.change(function () {
                that.bookOffer = $(this).data("object");
                that.bookOfferId = that.bookOffer["@id"];
                that.updateSubmitButtonDisabled();
                const apiUrl = that.entryPointUrl + that.bookOfferId + "/loans";

                // check if there are already loans on this book offer
                fetch(apiUrl, {
                    headers: {
                        'Content-Type': 'application/ld+json',
                        'Authorization': 'Bearer ' + window.VPUAuthToken,
                    },
                })
                .then(response => response.json())
                .then((result) => {
                    if (result['hydra:totalItems'] === 0) {
                        notify({
                            "summary": i18n.t('create-loan.info-no-existing-loans-summary'),
                            "body": i18n.t('create-loan.info-no-existing-loans-body'),
                            "type": "info",
                            "timeout": 5,
                        });
                        $createLoanBlock.show();
                    } else {
                        console.log(result['hydra:member']);
                        notify({
                            "summary": i18n.t('create-loan.error-existing-loans-summary'),
                            "body": i18n.t('create-loan.error-existing-loans-body'),
                            "type": "danger",
                            "timeout": 10,
                        });
                    }
                });
            }).on('unselect', function (e) {
                $createLoanBlock.hide();
            });

            // post loan with borrower
            that.$('#send').click((e) => {
                e.preventDefault();
                console.log("send");
                const apiUrl = that.entryPointUrl + that.bookOfferId + "/loans";
                console.log(apiUrl);

                const data = {
                    "borrower": that.personId
                };

                console.log(data);
                console.log(JSON.stringify(data));

                // disable send button to wait until ajax request was finished (or errored)
                that.$("#send").prop("disabled", true);

                $.ajax({
                    url: apiUrl,
                    type: 'POST',
                    contentType: 'application/json',
                    beforeSend: function( jqXHR ) {
                        jqXHR.setRequestHeader('Authorization', 'Bearer ' + window.VPUAuthToken);
                    },
                    data: JSON.stringify(data),
                    success: function(data) {
                        notify({
                            "summary": i18n.t('create-loan.success-summary'),
                            "body": i18n.t('create-loan.success-body'),
                            "type": "success",
                            "timeout": 5,
                        });

                        $bookOfferSelect[0].clear();
                    },
                    error: function (jqXHR, textStatus, errorThrown) {
                        const body = jqXHR.responseJSON !== undefined && jqXHR.responseJSON["hydra:description"] !== undefined ?
                            jqXHR.responseJSON["hydra:description"] : textStatus;

                        notify({
                            "summary": i18n.t('error-summary'),
                            "body": body,
                            "type": "danger",
                        });
                    },
                    complete: function (jqXHR, textStatus, errorThrown) {
                        that.updateSubmitButtonDisabled();
                    }
                });
            });
        });
    }

    updateSubmitButtonDisabled() {
        this.$("#send").prop("disabled", this.personId === "" || this.bookOfferId === "");
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

    static get styles() {
        return css`
            /* Select2 doesn't work well with display: none */
            .hidden {left: -9999px; position: absolute;}

            #create-loan-block, #permission-error-block { display: none; }
            #create-loan-block input { width: 100%; }
            .tile.is-ancestor .tile {margin: 10px;}
        `;
    }

    render() {
        const suggestionsCSS = utils.getAssetURL(suggestionsCSSPath);
        const bulmaCSS = utils.getAssetURL(bulmaCSSPath);

        return html`
            <link rel="stylesheet" href="${bulmaCSS}">
            <link rel="stylesheet" href="${suggestionsCSS}">

            <section class="section">
                <div class="container">
                    <h1 class="title">${i18n.t('create-loan.title')}</h1>
                    <h2 class="subtitle">${i18n.t('create-loan.subtitle')}</h2>
                </div>
            </section>
            <section class="section">
                <div class="container">
                    <form class="hidden">
                        <div class="field">
                            <label class="label">${i18n.t('person-select.headline')}</label>
                            <div class="control">
                                <vpu-person-select entry-point-url="${this.entryPointUrl}" lang="${this.lang}"></vpu-person-select>
                            </div>
                        </div>
                        <div class="field">
                            <label class="label">${i18n.t('library-book-offer-select.headline')}</label>
                            <div class="control">
                                 <vpu-library-book-offer-select entry-point-url="${this.entryPointUrl}" lang="${this.lang}"></vpu-library-book-offer-select>
                            </div>
                        </div>
                        <div class="field">
                            <div class="notification is-info">
                                Example book barcodes: <code>+F55555</code>, <code>+F123456</code>, <code>+F1234567</code>, <code>+F987654</code>
                            </div>
                        </div>
                        <div id="create-loan-block">
                            <div class="field">
                                <div class="control">
                                     <button class="button is-link" id="send" disabled="disabled">${i18n.t('create-loan.submit')}</button>
                                </div>
                            </div>
                        </div>
                    </form>
                    <div class="notification is-warning" id="login-error-block">
                        ${i18n.t('error-login-message')}
                    </div>
                    <div class="notification is-danger" id="permission-error-block">
                        ${i18n.t('error-permission-message')}
                    </div>
                </div>
            </section>
        `;
    }
}

commonUtils.defineCustomElement('vpu-library-create-loan', LibraryCreateLoan);
