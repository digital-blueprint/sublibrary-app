import $ from 'jquery';
import {i18n} from './i18n.js';
import {css, html} from 'lit-element';
import {send as notify} from 'vpu-notification';
import VPULibraryLitElement from "./vpu-library-lit-element";
import 'vpu-person-select';
import * as commonUtils from 'vpu-common/utils';
import * as commonStyles from 'vpu-common/styles';
import 'vpu-data-table-view';
import * as errorUtils from "vpu-common/error";

class LibraryRenewLoan extends VPULibraryLitElement {
    constructor() {
        super();
        this.lang = 'de';
        this.entryPointUrl = commonUtils.getAPiUrl();
        this.personId = "";
        this.person = null;
        this.loans = [];
        this.organizationId = '';
    }

    /**
     * See: https://lit-element.polymer-project.org/guide/properties#conversion-type
     */
    static get properties() {
        return {
            lang: { type: String },
            entryPointUrl: { type: String, attribute: 'entry-point-url' },
            personId: { type: String, attribute: 'person-id' },
            loans: { type: Object, attribute: false },
            organizationId: { type: String, attribute: 'organization-id' },
        };
    }

    getLibrary() {
        //console.log('getLibrary() organizationId = ' + this.organizationId);
        // until the API understands this:
        //this.organizationId == '/organizations/knowledge_base_organizations/1263-F2190';
        // extracting the orgUnitCode (F2190) is done here:
        return this.organizationId.includes('-') ? this.organizationId.split('-')[1] : '';
    }

    connectedCallback() {
        super.connectedCallback();
        const that = this;

        this.updateComplete.then(()=>{
            // language=css
            const css = `
                @media (min-width: 900px) {
                    td .date-col, td .button-col {
                        white-space: nowrap;
                    }
                }
    
                @media (max-width: 900px) {
                    td .date-col input[type="time"] {
                        margin-top: 5px;
                    }
                }

                table.dataTable thead th, table.dataTable thead td { padding: 10px; }
                .button-col > vpu-button {
                    margin-right: 5px;
                    margin-bottom: 5px;
                    display: inline-block;
                }
            `;

            this._("vpu-data-table-view").setCSSStyle(css);
            const $personSelect = that.$('vpu-person-select');
            const $renewLoanBlock = that.$('#renew-loan-block');
            const $noLoansBlock = that.$('#no-loans-block');
            const $loansLoadingIndicator = that.$('#loans-loading');

            // show user interface when logged in person object is available
            that.callInitUserInterface();

            // show loan list block if person was selected
            $personSelect.change(function () {
                that.person = $(this).data("object");

                if (that.person === undefined) {
                    return;
                }

                that.personId = that.person["@id"];
                const apiUrl = that.entryPointUrl + that.personId + "/library-book-loans";

                // set person-id of the custom element
                that.setAttribute("person-id", that.personId);

                // fire a change event
                that.dispatchEvent(new CustomEvent('change', {
                    detail: {
                        type: "person-id",
                        value: that.personId,
                    }
                }));

                $renewLoanBlock.hide();
                $noLoansBlock.hide();
                $loansLoadingIndicator.show();

                commonUtils.pollFunc(() => {
                    // we need to wait until orgUnitCode is present!
                    if (this.organizationId === '') {
                        return false;
                    }

                    // load list of loans for person
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
                        // TODO: check if logged-in user has permissions to the library of loan.object.library
                        that.loans = result['hydra:member'];

                        if (that.loans.length > 0) {
                            const vdtv1 = that._('#book-loans-1');
                            if (vdtv1 !== null) {
                                const minDate = new Date().toISOString();
                                const columns = [
                                    {title: i18n.t('renew-loan.book') },
                                    {title: i18n.t('renew-loan.end-date') },
                                    null,
                                    ''
                                ];
                                const vdtv1_columnDefs = [
                                    {targets: [2], visible: false},
                                    {targets: [1], orderData: [2]},
                                    {targets: [2, 3], searchable: false},
                                    {targets: [3], sortable: false}
                                ];
                                const orgUnitCode = that.getLibrary();
                                const tbl = [];
                                that.loans.forEach(function(loan) {
                                    if (loan.object.library !== orgUnitCode) {
                                        return;
                                    }

                                    const row = [
                                        loan.object.name,
                                        `<div class="date-col">
                                            <input data-date-id="${loan['@id']}"
                                                   type="date" min="${commonUtils.dateToInputDateString(minDate)}"
                                                   value="${commonUtils.dateToInputDateString(loan.endTime)}">
                                            <input data-time-id="${loan['@id']}"
                                                   type="time" class="hidden" value="23:59:59">
                                        </div>`,
                                        loan.endTime,
                                        `<div class="button-col">
                                            <vpu-button data-id="${loan['@id']}" data-type="renew"
                                                        value="Ok" name="send" type="is-small"
                                                        title="${i18n.t('renew-loan.renew-loan')}" no-spinner-on-click></vpu-button>
                                            <vpu-button data-id="${loan['@id']}" data-type="contact" data-book-name="${loan.object.name}"
                                                        value="${i18n.t('renew-loan.contact-value')}" name="send" type="is-small"
                                                        title="${i18n.t('renew-loan.contact-title', {personName: that.person.name})}" no-spinner-on-click></vpu-button>
                                        </div>`
                                    ];
                                    tbl.push(row);
                                });
                                vdtv1.set_columns(columns)
                                    .set_columnDefs(vdtv1_columnDefs)
                                    .set_datatable(tbl);
                            }
                            $renewLoanBlock.show();
                        } else {
                            $noLoansBlock.show();
                        }
                    }).catch(error => errorUtils.handleFetchError(error, i18n.t('renew-loan.error-load-loans-summary')));

                    return true;
                }, 10000, 100);

            }).on('unselect', function (e) {
                $renewLoanBlock.hide();
            });
        });
    }

    update(changedProperties) {
        changedProperties.forEach((oldValue, propName) => {
            if (propName === "lang") {
                i18n.changeLanguage(this.lang);

                /*
                const vdtv1 = this._('#book-loans-1');
                if (vdtv1 !== null) {
                    const columns = [
                        {title: i18n.t('renew-loan.book') },
                        {title: i18n.t('renew-loan.end-date') },
                        null,
                        ''
                    ];
                    vdtv1.set_columns(columns).set_datatable();
                }
                */

                // we need to update the book list because of the localization of the "Contact" button
                this.$('vpu-person-select').change();
            }
        });

        super.update(changedProperties);
    }

    onLanguageChanged(e) {
        this.lang = e.detail.lang;
    }

    /**
     * Handles all clicks on the data table
     *
     * @param e
     */
    onDataTableClick(e) {
        const path = e.composedPath();
        let button, buttonIndex = -1;

        // search for the vpu-button
        path.some((item, index) => {
            if (item.nodeName === "VPU-BUTTON") {
                button = item;
                buttonIndex = index;

                return true;
            }
        });

        // if the button was not found it wasn't clicked
        if (buttonIndex === -1) {
            return;
        }

        e.preventDefault();

        if (button.hasAttribute("disabled")) {
            return;
        }

        const type = button.getAttribute("data-type");
        const loanId = button.getAttribute("data-id");

        // check with button was clicked
        switch(type) {
            case "renew":
                button.start();
                const vdtv1 = this._('#book-loans-1');
                const dateSelect = vdtv1.shadowRoot.querySelector(`input[data-date-id='${loanId}']`);
                const timeSelect = vdtv1.shadowRoot.querySelector(`input[data-time-id='${loanId}']`);
                const date = new Date(dateSelect.value + " " + timeSelect.value);

                // check if selected date is in the past
                if (date < (new Date())) {
                    notify({
                        "summary": i18n.t('renew-loan.error-renew-loan-summary'),
                        "body": i18n.t('renew-loan.error-renew-loan-date-in-past'),
                        "type": "warning",
                        "timeout": 5,
                    });

                    button.stop();
                    return;
                }

                const data = {"endTime": date.toISOString()};
                const apiUrl = this.entryPointUrl + loanId;

                // update loan
                fetch(apiUrl, {
                    method: 'PUT',
                    body: JSON.stringify(data),
                    headers: {
                        'Content-Type': 'application/ld+json',
                        'Authorization': 'Bearer ' + window.VPUAuthToken,
                    },
                })
                    .then(result => {
                        if (!result.ok) throw result;
                        return result.json();
                    })
                    .then(loan => {
                        notify({
                            "summary": i18n.t('renew-loan.info-renew-loan-success-summary'),
                            "body": i18n.t('renew-loan.info-renew-loan-success-body'),
                            "type": "info",
                            "timeout": 5,
                        });
                        dateSelect.value = commonUtils.dateToInputDateString(loan.endTime);
                        timeSelect.value = commonUtils.dateToInputTimeString(loan.endTime);
                    }).catch(error => errorUtils.handleFetchError(error, i18n.t('renew-loan.error-renew-loan-summary')))
                    .finally(() => { button.stop(); });
                break;
            case "contact":
                const bookName = button.getAttribute("data-book-name");
                const subject = i18n.t('renew-loan.contact-subject', {bookName: bookName});

                // open mail client with new mail
                location.href = `mailto:${this.person.email}?subject=${subject}`;
                break;
        }
    }

    static get styles() {
        // language=css
        return css`
            ${commonStyles.getThemeCSS()}
            ${commonStyles.getGeneralCSS()}
            ${commonStyles.getNotificationCSS()}

            #renew-loan-block, #permission-error-block { display: none; }
            form, table {width: 100%}
            
            #no-loans-block{ font-weight: bold; }
        `;
    }

    render() {
        return html`
            <form class="hidden">
                <div class="field">
                    <label class="label">${i18n.t('person-select.headline')}</label>
                    <div class="control">
                        <vpu-person-select entry-point-url="${this.entryPointUrl}"
                                           lang="${this.lang}"
                                           value="${this.personId}"
                                           organization-id="${this.organizationId}"
                                           show-reload-button
                                           reload-button-title="${this.person ? i18n.t('renew-loan.button-refresh-title', {personName: this.person.name}): ""}"></vpu-person-select>
                    </div>
                </div>
                <vpu-mini-spinner id="loans-loading" style="font-size: 2em; display: none;"></vpu-mini-spinner>
                <div id="renew-loan-block" class="field">
                    <label class="label">${i18n.t('renew-loan.loans')}</label>
                    <div class="control">
                        <vpu-data-table-view searching paging lang="${this.lang}" id="book-loans-1" columns-count="4" @click="${(e) => this.onDataTableClick(e)}"></vpu-data-table-view>
                    </div>
                </div>
                <div id="no-loans-block" style="display: none;">
                    ${i18n.t('renew-loan.no-loans')}
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

commonUtils.defineCustomElement('vpu-library-renew-loan', LibraryRenewLoan);
