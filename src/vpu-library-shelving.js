import $ from 'jquery';
import * as utils from './utils.js';
import {i18n} from './i18n.js';
import {html} from 'lit-element';
import {send as notify} from 'vpu-notification';
import VPULitElementJQuery from 'vpu-common/vpu-lit-element-jquery';
import Suggestions from 'suggestions';
import 'vpu-language-select';
import * as commonUtils from 'vpu-common/utils';
import suggestionsCSSPath from 'suggestions/dist/suggestions.css';
import bulmaCSSPath from 'bulma/css/bulma.min.css';


class LibraryShelving extends VPULitElementJQuery {
    constructor() {
        super();
        this.lang = 'de';
        this.entryPointUrl = commonUtils.getAPiUrl();
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
            const $bookOfferSelect = that.$('vpu-library-book-offer-select');
            const $locationIdentifierInput = that.$('#location-identifier');
            const locationIdentifierInput = that._('#location-identifier');
            const $locationIdentifierBlock = that.$('#location-identifier-block');

            // check if the currently logged-in user has the role "ROLE_F_BIB_F" set
            window.addEventListener("vpu-auth-person-init", () => {
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
                $locationIdentifierInput.val(bookOffer.locationIdentifier).trigger("input");

                $locationIdentifierBlock.show();

                const apiUrl = that.entryPointUrl + bookOffer["@id"] + "/location_identifiers";

                // fetch and setup the location identifier suggestions
                fetch(apiUrl, {
                    headers: {
                        'Content-Type': 'application/ld+json',
                        'Authorization': 'Bearer ' + window.VPUAuthToken,
                    },
                })
                .then(response => response.json())
                .then((result) => {new Suggestions(locationIdentifierInput, result['hydra:member'])});
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

                // disable send button to wait until ajax request was finished (or errored)
                that.$("#send").prop("disabled", true);

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
                        that.$("#send").prop("disabled", false);
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

    render() {
        const suggestionsCSS = utils.getAssetURL(suggestionsCSSPath);
        const bulmaCSS = utils.getAssetURL(bulmaCSSPath);

        return html`
            <link rel="stylesheet" href="${bulmaCSS}">
            <link rel="stylesheet" href="${suggestionsCSS}">
            <style>
                #location-identifier-block, #permission-error-block { display: none; }
                #location-identifier-block input { width: 100%; }
                .tile.is-ancestor .tile {margin: 10px;}
            </style>

            <section class="section">
                <div class="container">
                    <h1 class="title">${i18n.t('title')}</h1>
                    <h2 class="subtitle">${i18n.t('subtitle')}</h2>
                </div>
            </section>
            <section class="section">
                <div class="container">
                    <div class="tile is-ancestor">
                        <div class="tile">
                            <form>
                                <div class="field">
                                    <label class="label">${i18n.t('library-book-offer-select.headline')}</label>
                                    <div class="control">
                                         <vpu-library-book-offer-select entry-point-url="${this.entryPointUrl}" lang="${this.lang}"></vpu-library-book-offer-select>
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
                                             <button class="button is-link" id="send" disabled="disabled">${i18n.t('location-identifier.submit')}</button>
                                        </div>
                                    </div>
                                </div>
                            </form>
                            <div class="notification is-danger" id="permission-error-block">
                                ${i18n.t('error-permission-message')}
                            </div>
                        </div>
                        <div class="tile">
                            <vpu-knowledge-base-web-page-element-view entry-point-url="${this.entryPointUrl}" lang="${this.lang}" value="bedienstete/bibliothek/buch-ausleihen" text="${i18n.t('more-information')}"></vpu-knowledge-base-web-page-element-view>
                        </div>
                    </div>
                </div>
            </section>
        `;
    }
}

commonUtils.defineCustomElement('vpu-library-shelving', LibraryShelving);
