import $ from 'jquery';
import {i18n} from './i18n.js';
import {css, html} from 'lit-element';
import {send as notify} from 'vpu-notification';
import VPULibraryLitElement from './vpu-library-lit-element';
import 'vpu-person-select';
import 'vpu-library-book-offer-select';
import * as commonUtils from 'vpu-common/utils';
import * as commonStyles from 'vpu-common/styles';
import * as errorUtils from "vpu-common/error";

class LibraryCreateLoan extends VPULibraryLitElement {
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
            bookOfferId: { type: String, attribute: 'book-offer-id' },
            bookOffer: { type: Object, attribute: false },
            personId: { type: String, attribute: 'person-id' },
        };
    }

    connectedCallback() {
        super.connectedCallback();
        const that = this;

        this.updateComplete.then(()=>{
            const $bookOfferSelect = that.$('vpu-library-book-offer-select');

            // show user interface when logged in person object is available
            that.callInitUserInterface();

            // post loan with borrower
            that.$('#send').click((e) => {
                e.preventDefault();

                const dateSelect = that._("input[type='date']");
                const timeSelect = that._("input[type='time']");
                const date = new Date(dateSelect.value + " " + timeSelect.value);

                // check if selected date is in the past
                if (date < (new Date())) {
                    notify({
                        "summary": i18n.t('error-summary'),
                        "body": i18n.t('renew-loan.error-renew-loan-date-in-past'),
                        "type": "warning",
                        "timeout": 5,
                    });

                    return;
                }

                console.log("send");
                const apiUrl = that.entryPointUrl + that.bookOfferId + "/loans";
                console.log(apiUrl);

                const data = {
                    "borrower": that.personId,
                    "library": window.VPUPersonLibrary.code,
                    "endTime": date.toISOString()
                };

                console.log(data);
                console.log(JSON.stringify(data));

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
                    error: errorUtils.handleXhrError,
                    complete: function (jqXHR, textStatus, errorThrown) {
                        that._("#send").stop();
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
        // language=css
        return css`
            ${commonStyles.getThemeCSS()}
            ${commonStyles.getGeneralCSS()}
            ${commonStyles.getNotificationCSS()}

            #create-loan-block, #permission-error-block { display: none; }
        `;
    }

    onBookSelectChanged(e) {
        const select = e.target;
        let bookOffer = select.dataset.object;
        const createLoanBlock = this.shadowRoot.querySelector('#create-loan-block');
        const loansLoadingIndicator = this.shadowRoot.querySelector('#loans-loading');

        if (!bookOffer) {
            this.bookOffer = null;
            this.bookOfferId = "";
            createLoanBlock.style.display = "none";
            return;
        }

        bookOffer = JSON.parse(bookOffer);

        const bookOfferId = bookOffer["@id"];

        if (this.bookOffer !== null && bookOfferId === this.bookOfferId)
            return;

        this.bookOffer = bookOffer;
        this.bookOfferId = bookOfferId;
        this.updateSubmitButtonDisabled();

        const apiUrl = this.entryPointUrl + this.bookOfferId + "/loans";

        // set book-offer-id of the custom element
        this.setAttribute("book-offer-id", this.bookOfferId);

        // fire a change event
        this.dispatchEvent(new CustomEvent('change', {
            detail: {
                type: "book-offer-id",
                value: this.bookOfferId,
            }
        }));

        // TODO: check if library of book matches person's functions
        loansLoadingIndicator.style.display = "block";

        // check if there are already loans on this book offer
        fetch(apiUrl, {
            headers: {
                'Content-Type': 'application/ld+json',
                'Authorization': 'Bearer ' + window.VPUAuthToken,
            },
        })
        .then(result => {
            loansLoadingIndicator.style.display = "none";
            if (!result.ok) throw result;
            return result.json();
        })
        .then(result => {
            const loans = result['hydra:member'];

            if (loans.length > 0) {
                console.log(loans);
                notify({
                    "summary": i18n.t('create-loan.error-existing-loans-summary'),
                    "body": i18n.t('create-loan.error-existing-loans-body'),
                    "type": "danger",
                    "timeout": 10,
                });
            } else {
                notify({
                    "summary": i18n.t('create-loan.info-no-existing-loans-summary'),
                    "body": i18n.t('create-loan.info-no-existing-loans-body'),
                    "type": "info",
                    "timeout": 5,
                });
                createLoanBlock.style.display = "block";
            }
        }).catch(error => errorUtils.handleFetchError(error, i18n.t('renew-loan.error-load-loans-summary')));
    }

    onPersonSelectChanged(e) {
        const select = e.target;
        const person = JSON.parse(select.dataset.object);
        const personId = person["@id"];

        this.updateSubmitButtonDisabled();

        this.personId = personId;
        this.person = person;

        // fire a change event
        this.dispatchEvent(new CustomEvent('change', {
            detail: {
                type: "person-id",
                value: this.personId,
            }
        }));
    }

    render() {
        const minDate = new Date().toISOString();
        let date = new Date();
        date.setMonth(date.getMonth() + 1);
        const loanDate = date.toISOString();

        return html`
            <form class="hidden">
                <div class="field">
                    <label class="label">${i18n.t('person-select.headline')}</label>
                    <div class="control">
                        <vpu-person-select entry-point-url="${this.entryPointUrl}"
                                           @change=${this.onPersonSelectChanged}
                                           lang="${this.lang}"
                                           value="${this.personId}">
                        </vpu-person-select>
                    </div>
                </div>
                <div class="field">
                    <label class="label">${i18n.t('library-book-offer-select.headline')}</label>
                    <div class="control">
                         <vpu-library-book-offer-select entry-point-url="${this.entryPointUrl}"
                                                        @change=${this.onBookSelectChanged}
                                                        @unselect=${this.onBookSelectChanged}
                                                        lang="${this.lang}"
                                                        value="${this.bookOfferId}"
                                                        show-reload-button
                                                        reload-button-title="${this.bookOffer ? i18n.t('create-loan.button-refresh-title', {name: this.bookOffer.name}): ""}"></vpu-library-book-offer-select>
                    </div>
                </div>
                <div class="field">
                    <div class="notification is-info">
                        Example book barcodes: <code>+F58330104</code>, <code>+F58019101</code>, <code>+F53498803</code>, <code>+F58347402</code>
                    </div>
                </div>
                <vpu-mini-spinner id="loans-loading" style="font-size: 2em; display: none;"></vpu-mini-spinner>
                <div id="create-loan-block">
                    <div class="field">
                        <label class="label">${i18n.t('renew-loan.end-date')}</label>
                        <input type="date" min="${commonUtils.dateToInputDateString(minDate)}" value="${commonUtils.dateToInputDateString(loanDate)}">
                        <input type="time" class="hidden" value="23:59:59">
                    </div>
                    <div class="field">
                        <div class="control">
                             <vpu-button id="send" disabled="disabled" value="${i18n.t('create-loan.submit')}" type=""></vpu-button>
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
        `;
    }
}

commonUtils.defineCustomElement('vpu-library-create-loan', LibraryCreateLoan);
