import $ from 'jquery';
import {i18n} from './i18n.js';
import {css, html} from 'lit-element';
import {send as notify} from 'vpu-notification';
import VPULitElementJQuery from 'vpu-common/vpu-lit-element-jquery';
import 'vpu-language-select';
import * as commonUtils from 'vpu-common/utils';
import * as commonStyles from 'vpu-common/styles';
import * as errorUtils from "vpu-common/error";

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
            bookOfferId: { type: String, attribute: 'book-offer-id' },
            personId: { type: String, attribute: 'person-id' },
        };
    }

    connectedCallback() {
        super.connectedCallback();
        const that = this;

        this.updateComplete.then(()=>{
            const $personSelect = that.$('vpu-person-select');
            const $bookOfferSelect = that.$('vpu-library-book-offer-select');
            const $createLoanBlock = that.$('#create-loan-block');
            const $loansLoadingIndicator = that.$('#loans-loading');

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

                // set person-id of the custom element
                that.setAttribute("person-id", that.personId);

                // fire a change event
                that.dispatchEvent(new CustomEvent('change', {
                    detail: {
                        type: "person-id",
                        value: that.personId,
                    }
                }));
            });

            // show create loan block if book offer was selected
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

                $loansLoadingIndicator.show();

                // check if there are already loans on this book offer
                fetch(apiUrl, {
                    headers: {
                        'Content-Type': 'application/ld+json',
                        'Authorization': 'Bearer ' + window.VPUAuthToken,
                    },
                })
                .then(result => {
                    $loansLoadingIndicator.hide();
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
                        $createLoanBlock.show();
                    }
                }).catch(error => errorUtils.handleFetchError(error, i18n.t('renew-loan.error-load-loans-summary')));
            }).on('unselect', function (e) {
                $createLoanBlock.hide();
            });

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
                        <vpu-person-select entry-point-url="${this.entryPointUrl}" lang="${this.lang}" value="${this.personId}"></vpu-person-select>
                    </div>
                </div>
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
