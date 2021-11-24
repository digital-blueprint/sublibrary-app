import $ from 'jquery';
import {createInstance} from './i18n.js';
import {css, html} from 'lit';
import {ScopedElementsMixin} from '@open-wc/scoped-elements';
import {send as notify} from '@dbp-toolkit/common/notification';
import {LibraryElement} from "./library-element.js";
import Suggestions from 'suggestions';
import * as commonUtils from '@dbp-toolkit/common/utils';
import * as commonStyles from '@dbp-toolkit/common/styles';
import suggestionsCSSPath from 'suggestions/dist/suggestions.css';
import {Button, MiniSpinner} from "@dbp-toolkit/common";
import {OrganizationSelect} from '@dbp-toolkit/organization-select';
import {classMap} from 'lit/directives/class-map.js';
import {LibraryBookOfferSelect} from './library-book-offer-select.js';

class LibraryShelving extends ScopedElementsMixin(LibraryElement) {
    constructor() {
        super();
        this.auth = {};
        this._i18n = createInstance();
        this.lang = this._i18n.language;
        this.entryPointUrl = '';
        this.bookOfferId = "";
        this.bookOffer = null;
        this.organizationId = '';
    }

    static get scopedElements() {
        return {
            'dbp-organization-select': OrganizationSelect,
            'dbp-library-book-offer-select': LibraryBookOfferSelect,
            'dbp-button': Button,
            'dbp-mini-spinner': MiniSpinner,
        };
    }

    static get properties() {
        return {
            ...super.properties,
            lang: { type: String },
            entryPointUrl: { type: String, attribute: 'entry-point-url' },
            bookOfferId: { type: String, attribute: 'book-offer-id', reflect: true},
            bookOffer: { type: Object, attribute: false },
            organizationId: { type: String, attribute: 'organization-id', reflect: true},
            auth: { type: Object },
        };
    }

    getLibrary() {
        //console.log('getLibrary() organizationId = ' + this.organizationId);
        // until the API understands this:
        //this.organizationId == '/organizations/1263-F2190';
        // extracting the orgUnitCode (F2190) is done here:
        return this.organizationId.includes('-') ? this.organizationId.split('-')[1] : '';
    }

    $(selector) {
        return $(this._(selector));
    }

    connectedCallback() {
        super.connectedCallback();
        const that = this;
        const i18n = this._i18n;

        this.updateComplete.then(()=>{
            const $bookOfferSelect = that.$(this.getScopedTagName('dbp-library-book-offer-select'));
            const $locationIdentifierInput = that.$('#location-identifier');
            const locationIdentifierInput = that._('#location-identifier');
            const $locationIdentifierBlock = that.$('#location-identifier-block');

            // show location identifier block if book offer was selected
            $bookOfferSelect.change(function () {
                console.log("change");
                console.log($bookOfferSelect.val());
                console.log($bookOfferSelect.attr("value"));
                console.log($bookOfferSelect.prop("value"));
                that.bookOffer = $(this).data("object");
                that.bookOfferId = that.bookOffer["@id"];
                $locationIdentifierInput.val(that.bookOffer.locationIdentifier).trigger("input");

                $locationIdentifierBlock.show();

                const apiUrl = that.entryPointUrl + that.bookOfferId + "/location_identifiers";

                // set book-offer-id of the custom element
                that.setAttribute("book-offer-id", that.bookOfferId);

                // fire a change event
                that.dispatchEvent(new CustomEvent('change', {
                    detail: {
                        type: "book-offer-id",
                        value: that.bookOfferId,
                    }
                }));

                // fetch and setup the location identifier suggestions
                fetch(apiUrl, {
                    headers: {
                        'Content-Type': 'application/ld+json',
                        'Authorization': 'Bearer ' + that.auth.token,
                    },
                })
                .then(response => response.json())
                .then((result) => {new Suggestions(locationIdentifierInput, result['hydra:member']);});
            }).on('unselect', function (e) {
                console.log("unselect");

                that.bookOffer = null;
                that.bookOfferId = "";
                $(that).attr("book-offer-id", null);

                $locationIdentifierBlock.hide();
            });

            // enable send button if location identifier was entered
            $locationIdentifierInput.on("input", function () {
                that.$("#send").prop("disabled", $(this).val() === "");
            });

            // update the book offer with location identifier
            that.$('#send').click((e) => {
                e.preventDefault();
                console.log("send");
                const apiUrl = that.entryPointUrl + $bookOfferSelect.val() +
                    "?library=" + that.getLibrary();
                console.log(apiUrl);
                console.log($locationIdentifierInput);

                const data = {
                    "locationIdentifier": $locationIdentifierInput.val()
                };

                console.log(data);
                console.log(JSON.stringify(data));

                $.ajax({
                    url: apiUrl,
                    type: 'PUT',
                    contentType: 'application/json',
                    beforeSend: function( jqXHR ) {
                        jqXHR.setRequestHeader('Authorization', 'Bearer ' + that.auth.token);
                    },
                    data: JSON.stringify(data),
                    success: function(data) {
                        notify({
                            "summary": i18n.t('success-summary'),
                            "body": i18n.t('success-body', {name: that.bookOffer.name || ""}),
                            "type": "success",
                            "timeout": 5,
                        });

                        $bookOfferSelect[0].clear();
                    },
                    error: (jqXHR, textStatus, errorThrown) => { this.handleXhrError(jqXHR, textStatus, errorThrown); },
                    complete: function (jqXHR, textStatus, errorThrown) {
                        that._("#send").stop();
                    }
                });
            });
        });
    }

    update(changedProperties) {
        changedProperties.forEach((oldValue, propName) => {
            if (propName === "lang") {
                this._i18n.changeLanguage(this.lang);
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

            .hidden {
                display: none;
            }

            #location-identifier-block { display: none; }

            #location-identifier-block input {
                width: 100%;
                border-radius: var(--dbp-border-radius);
            }
        `;
    }

    onOrgUnitCodeChanged(e) {
        this.organizationId = e.detail.value;
    }

    render() {
        const suggestionsCSS = commonUtils.getAssetURL(suggestionsCSSPath);
        const i18n = this._i18n;

        return html`
            <link rel="stylesheet" href="${suggestionsCSS}">

            <form class="${classMap({hidden: !this.isLoggedIn() || !this.hasLibraryPermissions() || this.isLoading()})}">
                <div class="field">
                    <label class="label">${i18n.t('organization-select.label')}</label>
                    <div class="control">
                        <dbp-organization-select subscribe="lang:lang,entry-point-url:entry-point-url,auth:auth"
                                                                context="library-manager"
                                                                value="${this.organizationId}"
                                                                @change="${this.onOrgUnitCodeChanged}"></dbp-organization-select>
                    </div>
                </div>
                <div class="field">
                    <label class="label">${i18n.t('library-book-offer-select.headline')}</label>
                    <div class="control">
                         <dbp-library-book-offer-select subscribe="lang:lang,entry-point-url:entry-point-url,auth:auth"
                                                        value="${this.bookOfferId}"
                                                        organization-id="${this.organizationId}"
                                                        show-reload-button
                                                        reload-button-title="${this.bookOffer ? i18n.t('shelving.button-refresh-title', {name: this.bookOffer.name}): ""}"></dbp-library-book-offer-select>
                    </div>
                </div>

                <div id="location-identifier-block">
                    <div class="field">
                        <label class="label">${i18n.t('location-identifier.headline')}</label>
                        <div class="control">
                            <input class="input" id="location-identifier" type="text" placeholder="${i18n.t('location-identifier.placeholder')}">
                        </div>
                    </div>
                    <div class="field">
                        <div class="control">
                             <dbp-button id="send" disabled="disabled" value="${i18n.t('location-identifier.submit')}" type=""></dbp-button>
                        </div>
                    </div>
                </div>
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

commonUtils.defineCustomElement('dbp-library-shelving', LibraryShelving);
