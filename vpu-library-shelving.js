import $ from 'jquery';
import utils from './utils.js';
import {i18n} from './i18n.js';
import {html} from 'lit-element';
import VPULitElement from './vpu-lit-element';

class LibraryShelving extends VPULitElement {
    constructor() {
        super();
        this.lang = 'de';
        this.prop1 = 'Person';
    }

    static get properties() {
        return {
            prop1: { type: String },
            lang: { type: String },
        };
    }

    connectedCallback() {
        super.connectedCallback();
        i18n.changeLanguage(this.lang);
        const that = this;

        this.updateComplete.then(()=>{
            const $bookOfferSelect = that.$('vpu-library-book-offer-select');
            const $locationIdentifierInput = that.$('#location-identifier');

            // show location identifier block if book offer was selected
            $bookOfferSelect.change(function () {
                console.log("change");
                console.log($bookOfferSelect.val());
                console.log($bookOfferSelect.attr("value"));
                console.log($bookOfferSelect.prop("value"));
                const bookOffer = $(this).data("object");
                $locationIdentifierInput.val(bookOffer.locationIdentifier).trigger("input");

                that.$('#location-identifier-block').show();
            });

            // enable send button if location identifier was entered
            $locationIdentifierInput.on("input", function () {
                that.$("#send").prop("disabled", $(this).val() === "");
            });

            // update the book offer with location identifier
            that.$('#send').click(function () {
                console.log("send");
                const apiUrl = utils.getAPiUrl($bookOfferSelect.val(), false);
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
                        // TODO: better success handling
                        alert(i18n.t('success-message'));
                    },
                    error: function (jqXHR, textStatus, errorThrown) {
                        error(textStatus);
                    },
                    complete: function (jqXHR, textStatus, errorThrown) {
                        that.$("#send").prop("disabled", false);
                    }
                });
            });
        });
    }

    render() {
        return html`
            <style>
                #location-identifier-block { display: none; }
                #location-identifier-block input { width: 100%; }
            </style>
            <h1>${this.prop1}</h1>

            <p>
                <vpu-auth lang="${this.lang}" client-id="${utils.setting('keyCloakClientId')}"></vpu-auth>
            </p>
            <p>
                <vpu-library-person-select lang="${this.lang}"></vpu-library-person-select>
            </p>
            <p>
                <vpu-library-book-offer-select lang="${this.lang}"></vpu-library-book-offer-select>
            </p>
            <div id="location-identifier-block">
                <p>
                    <b>${i18n.t('location-identifier.headline')}</b><br />
                    <input id="location-identifier" type="text" placeholder="${i18n.t('location-identifier.placeholder')}">
                </p>
                <p>
                    <button id="send" disabled="disabled">${i18n.t('location-identifier.submit')}</button>
                </p>
            </div>
        `;
    }
}

customElements.define('vpu-library-shelving', LibraryShelving);
