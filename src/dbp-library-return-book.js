import $ from 'jquery';
import {createI18nInstance, i18nKey} from './i18n.js';
import {css, html} from 'lit-element';
import {ScopedElementsMixin} from '@open-wc/scoped-elements';
import {LibraryElement} from "./library-element.js";
import * as commonUtils from 'dbp-common/utils';
import * as commonStyles from 'dbp-common/styles';
import * as errorUtils from "dbp-common/error";
import {OrganizationSelect} from './organization-select.js';
import {MiniSpinner, Button} from 'dbp-common';
import {classMap} from 'lit-html/directives/class-map.js';
import  {LibraryBookOfferSelect} from './library-book-offer-select.js';

const i18n = createI18nInstance();

class LibraryReturnBook extends ScopedElementsMixin(LibraryElement) {
    constructor() {
        super();
        this.lang = i18n.language;
        this.entryPointUrl = commonUtils.getAPiUrl();
        this.bookOfferId = "";
        this.bookOffer = null;
        this.loanId = "";
        this.loan = null;
        this.borrower = null;
        this.borrowerName = "";
        this.status = null;
        this.organizationId = '';
    }

    static get scopedElements() {
        return {
            'dbp-knowledge-base-organization-select': OrganizationSelect,
            'dbp-library-book-offer-select': LibraryBookOfferSelect,
            'dbp-mini-spinner': MiniSpinner,
            'dbp-button': Button,
        };
    }

    static get properties() {
        return {
            lang: { type: String },
            entryPointUrl: { type: String, attribute: 'entry-point-url' },
            bookOfferId: { type: String, attribute: 'book-offer-id', reflect: true},
            bookOffer: { type: Object, attribute: false },
            borrower: { type: Object, attribute: false },
            borrowerName: { type: String, attribute: false },
            status: { type: Object , attribute: false },
            organizationId: { type: String, attribute: 'organization-id', reflect: true},
        };
    }

    $(selector) {
        return $(this._(selector));
    }

    getLibrary() {
        //console.log('getLibrary() organizationId = ' + this.organizationId);
        // until the API understands this:
        //this.organizationId == '/organizations/1263-F2190';
        // extracting the orgUnitCode (F2190) is done here:
        return this.organizationId.includes('-') ? this.organizationId.split('-')[1] : '';
    }

    connectedCallback() {
        super.connectedCallback();
        const that = this;

        this.updateComplete.then(()=>{
            const $bookOfferSelect = that.$(this.getScopedTagName('dbp-library-book-offer-select'));
            const $returnBookBlock = that.$('#return-book-block');
            const $loansLoadingIndicator = that.$('#loans-loading');

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

                $loansLoadingIndicator.show();

                // check if there are already loans on this book offer
                fetch(apiUrl, {
                    headers: {
                        'Content-Type': 'application/ld+json',
                        'Authorization': 'Bearer ' + window.DBPAuthToken,
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
                        that.loan = loans[0];
                        that.loanId = that.loan["@id"];
                        console.log(that.loan);
                        that.loadBorrower(that.loan.borrower);

                        that.status = {
                            "summary": i18nKey('return-book.info-existing-loans-summary'),
                            "body": i18nKey('return-book.info-existing-loans-body'),
                        };

                        $returnBookBlock.show();
                    } else {

                        that.status = {
                            "summary": i18nKey('return-book.error-no-existing-loans-summary'),
                            "body": i18nKey('return-book.error-no-existing-loans-body'),
                        };
                    }
                }).catch(error => errorUtils.handleFetchError(error, i18n.t('renew-loan.error-load-loans-summary')));
            }).on('unselect', function (e) {
                $returnBookBlock.hide();
            });

            // update loan status of book loan
            that.$('#send').click((e) => {
                e.preventDefault();
                console.log("send");
                const apiUrl = that.entryPointUrl + that.bookOfferId + "/return" +
                    "?library=" + that.getLibrary();
                console.log('dbp-library-return-book: #send.click() apiUrl = ' + apiUrl);

                $.ajax({
                    url: apiUrl,
                    type: 'POST',
                    contentType: 'application/json',
                    beforeSend: function( jqXHR ) {
                        jqXHR.setRequestHeader('Authorization', 'Bearer ' + window.DBPAuthToken);
                    },
                    data: "{}",
                    success: function(data) {
                        $bookOfferSelect[0].clear();

                        that.status = {
                            "summary": i18nKey('return-book.success-summary'),
                            "body": i18n.t('return-book.success-body', {personName: that.borrowerName}),
                        };
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

    async onBookSelectChanged(e) {
        this.status = null;
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
        this.borrowerName = i18n.t('return-book.user-name-unknown');

        // this happens if no person was found in LDAP by AlmaUserId
        if (personId == null) {
            return;
        }

        const apiUrl = this.entryPointUrl + personId;

        // load person
        fetch(apiUrl, {
            headers: {
                'Content-Type': 'application/ld+json',
                'Authorization': 'Bearer ' + window.DBPAuthToken,
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
            ${commonStyles.getThemeCSS()}
            ${commonStyles.getGeneralCSS()}
            ${commonStyles.getNotificationCSS()}

            .hidden {
                display: none;
            }

            #return-book-block { display: none; }
            #return-book-block input { width: 100%; }
        `;
    }

    onOrgUnitCodeChanged(e) {
        this.organizationId = e.detail.value;
    }

    render() {
        return html`
            <form class="${classMap({hidden: !this.isLoggedIn() || !this.hasLibraryPermissions() || this.isLoading()})}">
                <div class="field">
                    <label class="label">${i18n.t('organization-select.label')}</label>
                    <div class="control">
                        <dbp-knowledge-base-organization-select lang="${this.lang}"
                                                                value="${this.organizationId}"
                                                                @change="${this.onOrgUnitCodeChanged}"></dbp-knowledge-base-organization-select>
                    </div>
                </div>
                <div class="field">
                    <label class="label">${i18n.t('library-book-offer-select.headline')}</label>
                    <div class="control">
                         <dbp-library-book-offer-select entry-point-url="${this.entryPointUrl}"
                                                        @change=${this.onBookSelectChanged}
                                                        @unselect=${this.onBookSelectChanged}
                                                        lang="${this.lang}"
                                                        value="${this.bookOfferId}"
                                                        organization-id="${this.organizationId}"
                                                        show-reload-button
                                                        reload-button-title="${this.bookOffer ? i18n.t('return-book.button-refresh-title', {name: this.bookOffer.name}): ""}"></dbp-library-book-offer-select>
                    </div>
                </div>

                <dbp-mini-spinner id="loans-loading" text="${i18n.t('return-book.mini-spinner-text')}" style="font-size: 2em; display: none;"></dbp-mini-spinner>
                <div id="return-book-block">
                    <div class="field">
                        <label class="label">${i18n.t('return-book.borrower')}</label>
                        <div class="control">
                            ${this.borrowerName}
                        </div>
                    </div>
                    <div class="field">
                        <div class="control">
                             <dbp-button id="send" disabled="disabled" value="${i18n.t('return-book.submit')}" type=""></dbp-button>
                        </div>
                    </div>
                </div>
                
                ${ this.status ? html`
                    <br />
                    <div class="notification is-info">
                        <h4>${i18n.t(this.status.summary)}</h4>
                        ${i18n.t(this.status.body)}
                    </div>
                `: ""}
            </form>
            <div class="notification is-warning ${classMap({hidden: this.isLoggedIn() || this.isLoading()})}">
                ${i18n.t('error-login-message')}
            </div>
            <div class="notification is-danger ${classMap({hidden: this.hasLibraryPermissions() || !this.isLoggedIn() || this.isLoading()})}">
                ${i18n.t('error-permission-message')}
            </div>
            <div class="${classMap({hidden: !this.isLoading()})}">
                <dbp-mini-spinner></dbp-mini-spinner>
            </div>
        `;
    }
}

commonUtils.defineCustomElement('dbp-library-return-book', LibraryReturnBook);