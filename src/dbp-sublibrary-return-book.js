import $ from 'jquery';
import {createInstance, i18nKey} from './i18n.js';
import {css, html} from 'lit';
import {ScopedElementsMixin} from '@open-wc/scoped-elements';
import {LibraryElement} from './library-element.js';
import * as commonUtils from '@dbp-toolkit/common/utils';
import * as commonStyles from '@dbp-toolkit/common/styles';
import {MiniSpinner, Button} from '@dbp-toolkit/common';
import {classMap} from 'lit/directives/class-map.js';
import {LibraryBookOfferSelect} from './library-book-offer-select.js';
import {getPersonDisplayName} from './utils.js';
import {LibrarySelect} from './library-select.js';

class LibraryReturnBook extends ScopedElementsMixin(LibraryElement) {
    constructor() {
        super();
        this.auth = {};
        this._i18n = createInstance();
        this.lang = this._i18n.language;
        this.entryPointUrl = '';
        this.bookOfferId = '';
        this.bookOffer = null;
        this.loanId = '';
        this.loan = null;
        this.borrower = null;
        this.borrowerName = '';
        this.status = null;
        this.sublibraryIri = '';
    }

    static get scopedElements() {
        return {
            'dbp-library-select': LibrarySelect,
            'dbp-sublibrary-book-offer-select': LibraryBookOfferSelect,
            'dbp-mini-spinner': MiniSpinner,
            'dbp-button': Button,
        };
    }

    static get properties() {
        return {
            ...super.properties,
            lang: {type: String},
            entryPointUrl: {type: String, attribute: 'entry-point-url'},
            bookOfferId: {type: String, attribute: 'book-offer-id', reflect: true},
            bookOffer: {type: Object, attribute: false},
            borrower: {type: Object, attribute: false},
            borrowerName: {type: String, attribute: false},
            status: {type: Object, attribute: false},
            sublibraryIri: {type: String, attribute: 'sublibrary-iri', reflect: true},
            auth: {type: Object},
        };
    }

    $(selector) {
        return $(this._(selector));
    }

    getSublibraryCode() {
        //console.log('getSublibraryCode() sublibraryIri = ' + this.sublibraryIri);
        // until the API understands this:
        //this.sublibraryIri == '/organizations/1263-F2190';
        // extracting the orgUnitCode (F2190) is done here:
        return this.sublibraryIri.includes('-') ? this.sublibraryIri.split('-')[1] : '';
    }

    connectedCallback() {
        super.connectedCallback();
        const that = this;
        const i18n = this._i18n;

        this.updateComplete.then(() => {
            const $bookOfferSelect = that.$(
                'dbp-sublibrary-book-offer-select'
            );
            const $returnBookBlock = that.$('#return-book-block');
            const $loansLoadingIndicator = that.$('#loans-loading');

            // show return book block if book offer was selected
            $bookOfferSelect
                .change(function () {
                    that.bookOffer = $(this).data('object');
                    that.bookOfferId = that.bookOffer['@id'];
                    that.updateSubmitButtonDisabled();
                    const apiUrl = that.entryPointUrl + that.bookOfferId + '/loans';

                    // set book-offer-id of the custom element
                    that.setAttribute('book-offer-id', that.bookOfferId);

                    // fire a change event
                    that.dispatchEvent(
                        new CustomEvent('change', {
                            detail: {
                                type: 'book-offer-id',
                                value: that.bookOfferId,
                            },
                        })
                    );

                    $loansLoadingIndicator.show();

                    // check if there are already loans on this book offer
                    fetch(apiUrl, {
                        headers: {
                            'Content-Type': 'application/ld+json',
                            Authorization: 'Bearer ' + that.auth.token,
                        },
                    })
                        .then((result) => {
                            $loansLoadingIndicator.hide();
                            if (!result.ok) throw result;
                            return result.json();
                        })
                        .then((result) => {
                            const loans = result['hydra:member'];

                            if (loans.length > 0) {
                                that.loan = loans[0];
                                that.loanId = that.loan['@id'];
                                console.log(that.loan);
                                that.loadBorrower(that.loan.borrower);

                                that.status = {
                                    summary: i18nKey('return-book.info-existing-loans-summary'),
                                    body: i18nKey('return-book.info-existing-loans-body'),
                                };

                                $returnBookBlock.show();
                            } else {
                                that.status = {
                                    summary: i18nKey('return-book.error-no-existing-loans-summary'),
                                    body: i18nKey('return-book.error-no-existing-loans-body'),
                                };
                            }
                        })
                        .catch((error) => {
                            that.handleFetchError(
                                error,
                                i18n.t('renew-loan.error-load-loans-summary')
                            );
                        });
                })
                .on('unselect', function (e) {
                    $returnBookBlock.hide();
                });

            // update loan status of book loan
            that.$('#send').click((e) => {
                e.preventDefault();
                console.log('send');
                const apiUrl =
                    that.entryPointUrl +
                    that.bookOfferId +
                    '/return' +
                    '?library=' +
                    that.getSublibraryCode();
                console.log('dbp-sublibrary-return-book: #send.click() apiUrl = ' + apiUrl);

                $.ajax({
                    url: apiUrl,
                    type: 'POST',
                    contentType: 'application/ld+json',
                    beforeSend: function (jqXHR) {
                        jqXHR.setRequestHeader('Authorization', 'Bearer ' + that.auth.token);
                    },
                    data: '{}',
                    success: function (data) {
                        $bookOfferSelect[0].clear();

                        that.status = {
                            summary: i18nKey('return-book.success-summary'),
                            body: i18n.t('return-book.success-body', {
                                personName: that.borrowerName,
                            }),
                        };
                    },
                    error: (jqXHR, textStatus, errorThrown) => {
                        that.handleXhrError(jqXHR, textStatus, errorThrown);
                    },
                    complete: function (jqXHR, textStatus, errorThrown) {
                        that._('#send').stop();
                        that.updateSubmitButtonDisabled();
                    },
                });
            });
        });
    }

    async onBookSelectChanged(e) {
        this.status = null;
    }

    updateSubmitButtonDisabled() {
        this.$('#send').prop('disabled', this.bookOfferId === '');
    }

    update(changedProperties) {
        changedProperties.forEach((oldValue, propName) => {
            if (propName === 'lang') {
                this._i18n.changeLanguage(this.lang);
            }
        });

        super.update(changedProperties);
    }

    onLanguageChanged(e) {
        this.lang = e.detail.lang;
    }

    loadBorrower(personId) {
        this.borrower = null;
        this.borrowerName = this._i18n.t('return-book.user-name-unknown');

        // this happens if no person was found in LDAP by AlmaUserId
        if (personId == null) {
            return;
        }

        const apiUrl = this.entryPointUrl + personId;

        // load person
        fetch(apiUrl, {
            headers: {
                'Content-Type': 'application/ld+json',
                Authorization: 'Bearer ' + this.auth.token,
            },
        })
            .then((response) => response.json())
            .then((person) => {
                this.borrower = person;
                this.borrowerName = getPersonDisplayName(person);
            });
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

            #return-book-block {
                display: none;
            }
            #return-book-block input {
                width: 100%;
            }
        `;
    }

    onSublibraryChanged(e) {
        this.sublibraryIri = e.detail.value;
    }

    render() {
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
                    <label class="label">${i18n.t('library-book-offer-select.headline')}</label>
                    <div class="control">
                        <dbp-sublibrary-book-offer-select
                            subscribe="lang:lang,entry-point-url:entry-point-url,auth:auth"
                            @change=${this.onBookSelectChanged}
                            @unselect=${this.onBookSelectChanged}
                            value="${this.bookOfferId}"
                            sublibrary-iri="${this.sublibraryIri}"
                            show-reload-button
                            reload-button-title="${this.bookOffer
                                ? i18n.t('return-book.button-refresh-title', {
                                      name: this.bookOffer.name,
                                  })
                                : ''}"></dbp-sublibrary-book-offer-select>
                    </div>
                </div>

                <dbp-mini-spinner
                    id="loans-loading"
                    text="${i18n.t('return-book.mini-spinner-text')}"
                    style="font-size: 2em; display: none;"></dbp-mini-spinner>
                <div id="return-book-block">
                    <div class="field">
                        <label class="label">${i18n.t('return-book.borrower')}</label>
                        <div class="control">${this.borrowerName}</div>
                    </div>
                    <div class="field">
                        <div class="control">
                            <dbp-button
                                id="send"
                                disabled="disabled"
                                value="${i18n.t('return-book.submit')}"
                                type=""></dbp-button>
                        </div>
                    </div>
                </div>

                ${this.status
                    ? html`
                          <br />
                          <div class="notification is-info">
                              <h4>${i18n.t(this.status.summary)}</h4>
                              ${i18n.t(this.status.body)}
                          </div>
                      `
                    : ''}
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

commonUtils.defineCustomElement('dbp-sublibrary-return-book', LibraryReturnBook);
