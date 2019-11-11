import {i18n} from './i18n.js';
import {css, html} from 'lit-element';
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
        this.status = null;
        this.orgUnitCode = '';
    }

    static get properties() {
        return {
            lang: { type: String },
            entryPointUrl: { type: String, attribute: 'entry-point-url' },
            bookOfferId: { type: String, attribute: 'book-offer-id' },
            bookOffer: { type: Object, attribute: false },
            personId: { type: String, attribute: 'person-id' },
            status: { type: Object },
            orgUnitCode: { type: String, attribute: 'org-unit-code' },
        };
    }

    connectedCallback() {
        super.connectedCallback();

        this.updateComplete.then(()=>{
            // show user interface when logged in person object is available
            this.callInitUserInterface();
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

    static get styles() {
        // language=css
        return css`
            ${commonStyles.getThemeCSS()}
            ${commonStyles.getGeneralCSS()}
            ${commonStyles.getNotificationCSS()}

            #create-loan-block, #permission-error-block { display: none; }
        `;
    }

    async onBookSelectChanged(e) {
        const select = e.target;
        let bookOffer = select.dataset.object;
        const createLoanBlock = this.shadowRoot.querySelector('#create-loan-block');
        const loansLoadingIndicator = this.shadowRoot.querySelector('#loans-loading');

        this.status = null;

        if (!bookOffer) {
            this.bookOffer = null;
            this.bookOfferId = "";
            createLoanBlock.style.display = "none";
            return;
        }

        bookOffer = JSON.parse(bookOffer);

        const bookOfferId = bookOffer["@id"];

        this.bookOffer = bookOffer;
        this.bookOfferId = bookOfferId;

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
        let result = null;

        try {
            // check if there are already loans on this book offer
            result = await fetch(apiUrl, {
                headers: {
                    'Content-Type': 'application/ld+json',
                    'Authorization': 'Bearer ' + window.VPUAuthToken,
                },
            });

            if (!result.ok)
                throw result;

            result = await result.json();
        } catch (error) {
            await errorUtils.handleFetchError(error, i18n.t('renew-loan.error-load-loans-summary'));
            return;
        } finally {
            loansLoadingIndicator.style.display = "none";
        }

        const loans = result['hydra:member'];

        if (loans.length > 0) {
            this.status = {
                "summary": 'create-loan.error-existing-loans-summary',
                "body": 'create-loan.error-existing-loans-body',
            };
        } else {
            this.status = {
                "summary": 'create-loan.info-no-existing-loans-summary',
                "body": 'create-loan.info-no-existing-loans-body',
            };
            createLoanBlock.style.display = "block";
        }
    }

    onPersonSelectChanged(e) {
        const select = e.target;
        const person = JSON.parse(select.dataset.object);

        this.personId = person["@id"];
        this.person = person;

        // fire a change event
        this.dispatchEvent(new CustomEvent('change', {
            detail: {
                type: "person-id",
                value: this.personId,
            }
        }));
    }

    async onSubmitClicked(e) {
        e.preventDefault();
        const button = e.currentTarget;
        try {
            await this.onSubmitClickedInternal(e);
        } finally {
            button.stop();
        }
    }

    async onSubmitClickedInternal(e) {
        const dateSelect = this._("input[type='date']");
        const timeSelect = this._("input[type='time']");
        const date = new Date(dateSelect.value + " " + timeSelect.value);

        // check if selected date is in the past
        if (date < (new Date())) {
            this.status = {
                "summary": i18n.t('error-summary'),
                "body": i18n.t('renew-loan.error-renew-loan-date-in-past'),
            };

            return;
        }

        const apiUrl = this.entryPointUrl + this.bookOfferId + "/loans";

        const data = {
            "borrower": this.personId,
            "library": this.orgUnitCode,
            "endTime": date.toISOString()
        };

        let response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + window.VPUAuthToken
            },
            body: JSON.stringify(data),
        });

        if (response.ok) {
            this.status = {
                "summary": 'create-loan.success-summary',
                "body": 'create-loan.success-body',
            };
        } else {
            await errorUtils.handleFetchError(response);
        }
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
                                                        org-unit-code="${this.orgUnitCode}"
                                                        show-reload-button
                                                        reload-button-title="${this.bookOffer ? i18n.t('create-loan.button-refresh-title', {name: this.bookOffer.name}): ""}"></vpu-library-book-offer-select>
                    </div>
                </div>
                <div class="field">
                    ${this.getExampleBookBarcodesHtml()}
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
                             <vpu-button id="send"
                                         @click=${this.onSubmitClicked}
                                         value="${i18n.t('create-loan.submit')}"
                                         type=""></vpu-button>
                        </div>
                    </div>
                </div>
                ${ this.status ? html`
                    <br>
                    <div class="notification is-info">
                        <h4>${i18n.t(this.status.summary)}</h4>
                        ${i18n.t(this.status.body)}
                    </div>
                `: ``}
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
