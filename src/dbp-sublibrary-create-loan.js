import {createInstance, i18nKey} from './i18n.js';
import {css, html} from 'lit';
import {ScopedElementsMixin} from '@open-wc/scoped-elements';
import {LibraryElement} from './library-element.js';
import {CustomPersonSelect} from './custom-person-select.js';
import {LibraryBookOfferSelect} from './library-book-offer-select.js';
import * as commonUtils from '@dbp-toolkit/common/utils';
import * as commonStyles from '@dbp-toolkit/common/styles';
import {MiniSpinner, Button} from '@dbp-toolkit/common';
import {classMap} from 'lit/directives/class-map.js';
import {getPersonDisplayName} from './utils.js';
import {LibrarySelect} from './library-select.js';
import {ReloadButton} from './reload-button.js';

class LibraryCreateLoan extends ScopedElementsMixin(LibraryElement) {
    constructor() {
        super();
        this.auth = {};
        this._i18n = createInstance();
        this.lang = this._i18n.language;
        this.entryPointUrl = '';
        this.bookOfferId = '';
        this.bookOffer = null;
        this.personId = '';
        this.person = null;
        this.status = null;
        this.sublibraryIri = '';
        this.sublibrary = null;
        this.sendButtonDisabled = true;
    }

    static get scopedElements() {
        return {
            'dbp-library-select': LibrarySelect,
            'dbp-person-select': CustomPersonSelect,
            'dbp-sublibrary-book-offer-select': LibraryBookOfferSelect,
            'dbp-mini-spinner': MiniSpinner,
            'dbp-button': Button,
            'dbp-reload-button': ReloadButton,
        };
    }

    static get properties() {
        return {
            ...super.properties,
            lang: {type: String},
            entryPointUrl: {type: String, attribute: 'entry-point-url'},
            bookOfferId: {type: String, attribute: 'book-offer-id', reflect: true},
            bookOffer: {type: Object, attribute: false},
            personId: {type: String, attribute: 'person-id', reflect: true},
            status: {type: Object},
            sublibraryIri: {type: String, attribute: 'sublibrary-iri', reflect: true},
            sendButtonDisabled: {type: Boolean, attribute: false},
            auth: {type: Object},
        };
    }

    connectedCallback() {
        super.connectedCallback();
    }

    update(changedProperties) {
        changedProperties.forEach((oldValue, propName) => {
            if (propName === 'lang') {
                this._i18n.changeLanguage(this.lang);
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

            .hidden {
                display: none;
            }

            #create-loan-block {
                display: none;
            }

            dbp-sublibrary-book-offer-select {
                width: 100%;
                margin-right: 4px;
            }

            .book-offer-select-container {
                display: flex;
            }
        `;
    }

    async onBookSelectChanged(e) {
        await this.updateCreateLoan();
    }

    async updateCreateLoan() {
        const select = this.shadowRoot.querySelector("dbp-sublibrary-book-offer-select");
        let bookOffer = select.dataset.object;
        const createLoanBlock = this.shadowRoot.querySelector('#create-loan-block');
        const loansLoadingIndicator = this.shadowRoot.querySelector('#loans-loading');

        this.status = null;

        if (!bookOffer) {
            this.status = null;
            this.bookOffer = null;
            this.bookOfferId = '';
            createLoanBlock.style.display = 'none';
            return;
        }

        bookOffer = JSON.parse(bookOffer);

        const bookOfferId = bookOffer['@id'];

        this.bookOffer = bookOffer;
        this.bookOfferId = bookOfferId;

        const apiUrl = this.entryPointUrl + this.bookOfferId + '/loans';

        // set book-offer-id of the custom element
        this.setAttribute('book-offer-id', this.bookOfferId);

        // fire a change event
        this.dispatchEvent(
            new CustomEvent('change', {
                detail: {
                    type: 'book-offer-id',
                    value: this.bookOfferId,
                },
            })
        );

        // TODO: check if library of book matches person's functions
        loansLoadingIndicator.style.display = 'block';
        let result = null;

        try {
            // check if there are already loans on this book offer
            result = await fetch(apiUrl, {
                headers: {
                    'Content-Type': 'application/ld+json',
                    Authorization: 'Bearer ' + this.auth.token,
                },
            });

            if (!result.ok) throw result;

            result = await result.json();
        } catch (error) {
            await this.handleFetchError(error, this._i18n.t('renew-loan.error-load-loans-summary'));
            return;
        } finally {
            loansLoadingIndicator.style.display = 'none';
        }

        const loans = result['hydra:member'];

        if (loans.length > 0) {
            this.status = {
                summary: i18nKey('create-loan.error-existing-loans-summary'),
                body: i18nKey('create-loan.error-existing-loans-body'),
                type: 'danger',
            };
        } else {
            this.status = {
                summary: i18nKey('create-loan.info-no-existing-loans-summary'),
                body: i18nKey('create-loan.info-no-existing-loans-body'),
                type: 'info',
            };
            createLoanBlock.style.display = 'block';
        }
    }

    getSublibraryCode() {
        //console.log('getSublibraryCode() sublibraryIri = ' + this.sublibraryIri);
        // until the API understands this:
        //this.sublibraryIri == '/organizations/1263-F2190';
        // extracting the orgUnitCode (F2190) is done here:
        return this.sublibrary.code;
    }

    onPersonSelectChanged(e) {
        const select = e.target;
        const person = JSON.parse(select.dataset.object);
        const personId = person['@id'];
        this.sendButtonDisabled = false;

        this.personId = personId;
        this.person = person;

        // fire a change event
        this.dispatchEvent(
            new CustomEvent('change', {
                detail: {
                    type: 'person-id',
                    value: this.personId,
                },
            })
        );
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
        let isoString = dateSelect.value;
        if (timeSelect.value) isoString += 'T' + timeSelect.value;
        const date = new Date(isoString);

        // check if selected date is in the past
        if (date < new Date()) {
            this.status = {
                summary: this._i18n.t('error-summary'),
                body: this._i18n.t('renew-loan.error-renew-loan-date-in-past'),
                type: 'danger',
            };

            return;
        }

        const apiUrl = this.entryPointUrl + this.bookOfferId + '/loans';

        const data = {
            borrower: this.personId,
            library: this.getSublibraryCode(),
            endTime: date.toISOString(),
        };

        let response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                Accept: 'application/ld+json',
                'Content-Type': 'application/json',
                Authorization: 'Bearer ' + this.auth.token,
            },
            body: JSON.stringify(data),
        });

        if (response.ok) {
            // clear book offer select to hide "loan" button
            const bookOfferSelect = this._(
                this.getScopedTagName('dbp-sublibrary-book-offer-select')
            );
            bookOfferSelect.clear();

            this.status = {
                summary: i18nKey('create-loan.success-summary'),
                body: this._i18n.t('create-loan.success-body', {
                    personName: getPersonDisplayName(this.person),
                }),
                type: 'info',
            };
        } else {
            await this.handleFetchError(response);
        }
    }

    onSublibraryChanged(e) {
        this.sublibraryIri = e.detail.value;
        this.sublibrary = e.detail.object;
    }

    onReloadButtonClicked(e) {
        this.updateCreateLoan();
    }

    render() {
        const minDate = new Date().toISOString();
        let date = new Date();
        date.setMonth(date.getMonth() + 1);
        const loanDate = date.toISOString();
        const i18n = this._i18n;

        return html`
            <form
                class="${classMap({
                    hidden: !this.isLoggedIn() || !this.hasLibraryPermissions() || this.isLoading(),
                })}">
                <div class="field">
                    <label class="label">${i18n.t('organization-select.label')}</label>
                    <div class="control">
                        <dbp-library-select
                            subscribe="lang:lang,entry-point-url:entry-point-url,auth:auth"
                            value="${this.sublibraryIri}"
                            @change="${this.onSublibraryChanged}"></dbp-library-select>
                    </div>
                </div>
                <div class="field">
                    <label class="label">${i18n.t('person-select.headline')}</label>
                    <div class="control">
                        <dbp-person-select
                            subscribe="lang:lang,entry-point-url:entry-point-url,auth:auth"
                            @change=${this.onPersonSelectChanged}
                            value="${this.personId}">
                        </dbp-person-select>
                    </div>
                </div>
                <div class="field">
                    <label class="label">${i18n.t('library-book-offer-select.headline')}</label>
                    <div class="control book-offer-select-container">
                        <dbp-sublibrary-book-offer-select
                            subscribe="auth:auth,lang:lang,entry-point-url:entry-point-url,auth:auth"
                            @change=${this.onBookSelectChanged}
                            @unselect=${this.onBookSelectChanged}
                            value="${this.bookOfferId}"
                            sublibrary-iri="${this.sublibraryIri}"></dbp-sublibrary-book-offer-select>
                        <dbp-reload-button
                            ?disabled=${!this.bookOffer}
                            @click=${this.onReloadButtonClicked}
                            title="${this.bookOffer
                                    ? i18n.t('shelving.button-refresh-title', {
                                        name: this.bookOffer.name,
                                    })
                                    : ''}"
                        ></dbp-reload-button>
                    </div>
                </div>

                <dbp-mini-spinner
                    id="loans-loading"
                    text="${i18n.t('create-loan.mini-spinner-text')}"
                    style="font-size: 2em; display: none;"></dbp-mini-spinner>
                <div id="create-loan-block">
                    <div class="field">
                        <label class="label">${i18n.t('renew-loan.end-date')}</label>
                        <input
                            class="input"
                            type="date"
                            min="${commonUtils.dateToInputDateString(minDate)}"
                            value="${commonUtils.dateToInputDateString(loanDate)}" />
                        <input type="time" class="hidden" value="23:59:59" />
                    </div>
                    <div class="field">
                        <div class="control">
                            <dbp-button
                                id="send"
                                @click=${this.onSubmitClicked}
                                value="${i18n.t('create-loan.submit')}"
                                ?disabled="${this.sendButtonDisabled}"
                                type=""></dbp-button>
                        </div>
                    </div>
                </div>
                ${this.status
                    ? html`
                          <br />
                          <div class="notification is-${this.status.type}">
                              <h4>${i18n.t(this.status.summary)}</h4>
                              ${i18n.t(this.status.body)}
                          </div>
                      `
                    : ``}
            </form>
            <div
                class="notification is-warning ${classMap({
                    hidden: this.isLoggedIn() || this.isLoading(),
                })}">
                ${i18n.t('error-login-message')}
            </div>
            <div
                class="notification is-danger ${classMap({
                    hidden: this.hasLibraryPermissions() || !this.isLoggedIn() || this.isLoading(),
                })}">
                ${i18n.t('error-permission-message')}
            </div>
            <div class="${classMap({hidden: !this.isLoading()})}">
                <dbp-mini-spinner></dbp-mini-spinner>
            </div>
        `;
    }
}

commonUtils.defineCustomElement('dbp-sublibrary-create-loan', LibraryCreateLoan);
