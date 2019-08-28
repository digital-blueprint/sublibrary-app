import $ from 'jquery';
import * as utils from './utils.js';
import {i18n} from './i18n.js';
import {css, html} from 'lit-element';
import {send as notify} from 'vpu-notification';
import VPULitElementJQuery from 'vpu-common/vpu-lit-element-jquery';
import 'vpu-language-select';
import * as commonUtils from 'vpu-common/utils';
import bulmaCSSPath from 'bulma/css/bulma.min.css';

class LibraryReturnBook extends VPULitElementJQuery {
    constructor() {
        super();
        this.lang = 'de';
        this.entryPointUrl = commonUtils.getAPiUrl();
        this.bookOfferId = "";
        this.bookOffer = null;
        this.loanId = "";
        this.loan = null;
        this.borrower = null;
        this.borrowerName = "";
    }

    static get properties() {
        return {
            lang: { type: String },
            entryPointUrl: { type: String, attribute: 'entry-point-url' },
            bookOfferId: { type: String, attribute: 'book-offer-id' },
            borrower: { type: Object, attribute: false },
            borrowerName: { type: String, attribute: false },
        };
    }

    connectedCallback() {
        super.connectedCallback();
        const that = this;

        this.updateComplete.then(()=>{
            const $bookOfferSelect = that.$('vpu-library-book-offer-select');
            const $returnBookBlock = that.$('#return-book-block');

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

            // show return book block if book offer was selected
            $bookOfferSelect.change(function () {
                that.bookOffer = $(this).data("object");
                that.bookOfferId = that.bookOffer["@id"];
                that.updateSubmitButtonDisabled();
                const apiUrl = that.entryPointUrl + that.bookOfferId + "/loans";

                // set book-offer-id of the custom element
                that.setAttribute("book-offer-id", that.bookOfferId);

                // fire a change event
                that.dispatchEvent(new CustomEvent('change', {
                    detail: {
                        type: "book-offer-id",
                        value: that.bookOfferId,
                    }
                }));

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
                            "summary": i18n.t('return-book.error-no-existing-loans-summary'),
                            "body": i18n.t('return-book.error-no-existing-loans-body'),
                            "type": "warning",
                            "timeout": 5,
                        });
                    } else {
                        that.loan = result['hydra:member'][0];
                        that.loanId = that.loan["@id"];
                        console.log(that.loan);
                        that.loadBorrower(that.loan.borrower);

                        notify({
                            "summary": i18n.t('return-book.info-existing-loans-summary'),
                            "body": i18n.t('return-book.info-existing-loans-body'),
                            "type": "info",
                            "timeout": 5,
                        });
                        $returnBookBlock.show();
                    }
                });
            }).on('unselect', function (e) {
                $returnBookBlock.hide();
            });

            // update loan status of book loan
            that.$('#send').click((e) => {
                e.preventDefault();
                console.log("send");
                const apiUrl = that.entryPointUrl + that.bookOfferId + "/return";
                console.log(apiUrl);

                // disable send button to wait until ajax request was finished (or errored)
                that.$("#send").prop("disabled", true);

                $.ajax({
                    url: apiUrl,
                    type: 'POST',
                    contentType: 'application/json',
                    beforeSend: function( jqXHR ) {
                        jqXHR.setRequestHeader('Authorization', 'Bearer ' + window.VPUAuthToken);
                    },
                    data: "{}",
                    success: function(data) {
                        notify({
                            "summary": i18n.t('return-book.success-summary'),
                            "body": i18n.t('return-book.success-body'),
                            "type": "success",
                            "timeout": 5,
                        });
                    },
                    error: function (jqXHR, textStatus, errorThrown) {
                        const body = jqXHR.responseJSON !== undefined && jqXHR.responseJSON["hydra:description"] !== undefined ?
                            jqXHR.responseJSON["hydra:description"] : textStatus;

                        notify({
                            "summary": i18n.t('error-summary'),
                            "body": body,
                            "type": "danger",
                            "timeout": 10,
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
        this.$("#send").prop("disabled", this.bookOfferId === "");
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

    loadBorrower(personId) {
        this.borrower = null;
        this.borrowerName = "";
        const apiUrl = this.entryPointUrl + personId;

        // load person
        fetch(apiUrl, {
            headers: {
                'Content-Type': 'application/ld+json',
                'Authorization': 'Bearer ' + window.VPUAuthToken,
            },
        })
            .then(response => response.json())
            .then((person) => {
                this.borrower = person;
                this.borrowerName = person.name;
            });
    }

    static get styles() {
        // language=css
        return css`
            /* Select2 doesn't work well with display: none */
            .hidden {left: -9999px; position: absolute;}

            #return-book-block, #permission-error-block { display: none; }
            #return-book-block input { width: 100%; }
        `;
    }

    render() {
        const bulmaCSS = utils.getAssetURL(bulmaCSSPath);

        return html`
            <link rel="stylesheet" href="${bulmaCSS}">

            <section class="section">
                <div class="container">
                    <h1 class="title">${i18n.t('return-book.title')}</h1>
                    <h2 class="subtitle">${i18n.t('return-book.subtitle')}</h2>
                </div>
            </section>
            <section class="section">
                <div class="container">
                    <form class="hidden">
                        <div class="field">
                            <label class="label">${i18n.t('library-book-offer-select.headline')}</label>
                            <div class="control">
                                 <vpu-library-book-offer-select entry-point-url="${this.entryPointUrl}" lang="${this.lang}" value="${this.bookOfferId}"></vpu-library-book-offer-select>
                            </div>
                        </div>
                        <div class="field">
                            <div class="notification is-info">
                                Example book barcodes: <code>+F55555</code>, <code>+F123456</code>, <code>+F1234567</code>, <code>+F987654</code>
                            </div>
                        </div>
                        <div id="return-book-block">
                            <div class="field">
                                <label class="label">${i18n.t('return-book.borrower')}</label>
                                <div class="control">
                                    ${this.borrowerName}
                                </div>
                            </div>
                            <div class="field">
                                <div class="control">
                                     <button class="button is-link" id="send" disabled="disabled">${i18n.t('return-book.submit')}</button>
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

commonUtils.defineCustomElement('vpu-library-return-book', LibraryReturnBook);
