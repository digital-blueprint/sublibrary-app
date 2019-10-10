import $ from 'jquery';
import {i18n} from './i18n.js';
import {css, html} from 'lit-element';
import {send as notify} from 'vpu-notification';
import VPULitElementJQuery from 'vpu-common/vpu-lit-element-jquery';
import Suggestions from 'suggestions';
import 'vpu-language-select';
import * as commonUtils from 'vpu-common/utils';
import suggestionsCSSPath from 'suggestions/dist/suggestions.css';
import * as errorUtils from "vpu-common/error";


class LibraryShelving extends VPULitElementJQuery {
    constructor() {
        super();
        this.lang = 'de';
        this.entryPointUrl = commonUtils.getAPiUrl();
        this.bookOfferId = "";
    }

    static get properties() {
        return {
            lang: { type: String },
            entryPointUrl: { type: String, attribute: 'entry-point-url' },
            bookOfferId: { type: String, attribute: 'book-offer-id' },
        };
    }

    connectedCallback() {
        super.connectedCallback();
        const that = this;

        this.updateComplete.then(()=>{
            const $bookOfferSelect = that.$('vpu-library-book-offer-select');
            const $locationIdentifierInput = that.$('#location-identifier');
            const locationIdentifierInput = that._('#location-identifier');
            const $locationIdentifierBlock = that.$('#location-identifier-block');

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

            // show location identifier block if book offer was selected
            $bookOfferSelect.change(function () {
                console.log("change");
                console.log($bookOfferSelect.val());
                console.log($bookOfferSelect.attr("value"));
                console.log($bookOfferSelect.prop("value"));
                const bookOffer = $(this).data("object");
                that.bookOfferId = bookOffer["@id"];
                $locationIdentifierInput.val(bookOffer.locationIdentifier).trigger("input");

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
                        'Authorization': 'Bearer ' + window.VPUAuthToken,
                    },
                })
                .then(response => response.json())
                .then((result) => {new Suggestions(locationIdentifierInput, result['hydra:member']);});
            }).on('unselect', function (e) {
                console.log("unselect");
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
                const apiUrl = that.entryPointUrl + $bookOfferSelect.val();
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
                        jqXHR.setRequestHeader('Authorization', 'Bearer ' + window.VPUAuthToken);
                    },
                    data: JSON.stringify(data),
                    success: function(data) {
                        notify({
                            "summary": i18n.t('success-summary'),
                            "body": i18n.t('success-body'),
                            "type": "success",
                            "timeout": 5,
                        });

                        $bookOfferSelect[0].clear();
                    },
                    error: errorUtils.handleXhrError,
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
            ${commonUtils.getThemeCSS()}
            ${commonUtils.getGeneralCSS()}
            ${commonUtils.getNotificationCSS()}

            .hidden, #location-identifier-block, #permission-error-block { display: none; }

            #location-identifier-block input {
                width: 100%;
                border-radius: var(--vpu-border-radius);
            }
        `;
    }

    render() {
        const suggestionsCSS = commonUtils.getAssetURL(suggestionsCSSPath);

        return html`
            <link rel="stylesheet" href="${suggestionsCSS}">

            <form class="hidden">
                <div class="field">
                    <label class="label">${i18n.t('library-book-offer-select.headline')}</label>
                    <div class="control">
                         <vpu-library-book-offer-select entry-point-url="${this.entryPointUrl}" lang="${this.lang}" value="${this.bookOfferId}"></vpu-library-book-offer-select>
                    </div>
                </div>
                <div class="field">
                    <div class="notification is-info">
                        Example book barcodes: <code>+F55555</code>, <code>+F123456</code>, <code>+F1234567</code>
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
                             <vpu-button id="send" disabled="disabled" value="${i18n.t('location-identifier.submit')}" type="is-primary"></vpu-button>
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

commonUtils.defineCustomElement('vpu-library-shelving', LibraryShelving);
