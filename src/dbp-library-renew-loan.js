import $ from 'jquery';
import {createI18nInstance} from './i18n.js';
import {css, html} from 'lit-element';
import {ScopedElementsMixin} from '@open-wc/scoped-elements';
import {send as notify} from '@dbp-toolkit/common/notification';
import {LibraryElement} from "./library-element.js";
import {PersonSelect} from '@dbp-toolkit/person-select';
import * as commonUtils from '@dbp-toolkit/common/utils';
import * as commonStyles from '@dbp-toolkit/common/styles';
import {DataTableView} from '@dbp-toolkit/data-table-view';
import {OrganizationSelect} from '@dbp-toolkit/organization-select';
import {MiniSpinner, Button} from '@dbp-toolkit/common';
import {classMap} from 'lit-html/directives/class-map.js';

const i18n = createI18nInstance();

class LibraryRenewLoan extends ScopedElementsMixin(LibraryElement) {
    constructor() {
        super();
        this.auth = {};
        this.lang = i18n.language;
        this.entryPointUrl = '';
        this.personId = "";
        this.person = null;
        this.loans = [];
        this.organizationId = '';
    }

    static get scopedElements() {
        return {
            'dbp-organization-select': OrganizationSelect,
            'dbp-person-select': PersonSelect,
            'dbp-mini-spinner': MiniSpinner,
            'dbp-button': Button,
            'dbp-data-table-view': DataTableView,
        };
    }

    /**
     * See: https://lit-element.polymer-project.org/guide/properties#conversion-type
     */
    static get properties() {
        return {
            ...super.properties,
            lang: { type: String },
            entryPointUrl: { type: String, attribute: 'entry-point-url' },
            personId: { type: String, attribute: 'person-id', reflect: true},
            loans: { type: Object, attribute: false },
            organizationId: { type: String, attribute: 'organization-id', reflect: true},
            auth: { type: Object },
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
                .button-col > dbp-button {
                    margin-right: 5px;
                    margin-bottom: 5px;
                    display: inline-block;
                }

                table.dataTable tbody tr.odd {
                    background-color: #f9f9f9;
                }
            `;

            this._(this.getScopedTagName("dbp-data-table-view")).setCSSStyle(css);
            const $personSelect = that.$(this.getScopedTagName('dbp-person-select'));
            const $renewLoanBlock = that.$('#renew-loan-block');

            // show loan list block if person was selected
            $personSelect.change(function () {

                that.person = $(this).data("object");

                if (that.person === undefined) {
                    return;
                }

                that.personId = that.person["@id"];

                // set person-id of the custom element
                that.setAttribute("person-id", that.personId);

                // fire a change event
                that.dispatchEvent(new CustomEvent('change', {
                    detail: {
                        type: "person-id",
                        value: that.personId,
                    }
                }));

                that.loadTable();

            }).on('unselect', function (e) {
                $renewLoanBlock.hide();
            });
        });
    }

    loadTable() {
        const that = this;

        const apiUrl = this.entryPointUrl + this.personId + "/library-book-loans";

        const $noLoansBlock = this.$('#no-loans-block');
        const $loansLoadingIndicator = this.$('#loans-loading');
        const $renewLoanBlock = this.$('#renew-loan-block');

        if (this.person == null || this.organizationId === '' ) {
            return;
        }

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
                    'Authorization': 'Bearer ' + this.auth.token,
                },
            })
                .then(result => {
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
                                {title: i18n.t('book-list.book-description')},
                                {title: i18n.t('renew-loan.end-date') },
                                null,
                                ''
                            ];
                            const vdtv1_columnDefs = [
                                {targets: [3], visible: false},
                                {targets: [2], orderData: [3]},
                                {targets: [3, 4], searchable: false},
                                {targets: [4], sortable: false}
                            ];
                            const orgUnitCode = that.getLibrary();
                            const tbl = [];
                            that.loans.forEach(function(loan) {
                                if (loan.object.library !== orgUnitCode) {
                                    return;
                                }
                                let button = that.getScopedTagName("dbp-button");

                                const row = [
                                    loan.object.name,
                                    loan.object.description,
                                    `<div class="date-col">
                                            <input data-date-id="${loan['@id']}"
                                                   type="date" min="${commonUtils.dateToInputDateString(minDate)}"
                                                   value="${commonUtils.dateToInputDateString(loan.endTime)}">
                                            <input data-time-id="${loan['@id']}"
                                                   type="time" class="hidden" value="23:59:59">
                                        </div>`,
                                    loan.endTime,
                                    `<div class="button-col">
                                            <${button} data-id="${loan['@id']}" data-type="renew"
                                                        value="Ok" name="send" type="is-small"
                                                        title="${i18n.t('renew-loan.renew-loan')}" no-spinner-on-click></${button}>
                                            <${button} data-id="${loan['@id']}" data-type="contact" data-book-name="${loan.object.name}"
                                                        value="${i18n.t('renew-loan.contact-value')}" name="send" type="is-small"
                                                        title="${i18n.t('renew-loan.contact-title', {personName: that.person.name})}" no-spinner-on-click></${button}>
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
                    $loansLoadingIndicator.hide();
                }).catch(error => {
                    this.handleFetchError(error, i18n.t('renew-loan.error-load-loans-summary'));
                    $loansLoadingIndicator.hide();
                });

            return true;
        }, 10000, 100);
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
                this.$(this.getScopedTagName('dbp-person-select')).change();
            } else if (propName === "organizationId") {

                this.loadTable();
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

        // search for the dbp-button
        path.some((item, index) => {
            if (item.nodeName.toUpperCase() === this.getScopedTagName("dbp-button").toUpperCase()) {
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
            case "renew": {
                button.start();
                const vdtv1 = this._('#book-loans-1');
                const dateSelect = vdtv1.shadowRoot.querySelector(`input[data-date-id='${loanId}']`);
                const timeSelect = vdtv1.shadowRoot.querySelector(`input[data-time-id='${loanId}']`);
                let isoString = dateSelect.value;
                if (timeSelect.value)
                    isoString += 'T' + timeSelect.value;
                const date = new Date(isoString);

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
                        'Authorization': 'Bearer ' + this.auth.token,
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
                    }).catch(error => { this.handleFetchError(error, i18n.t('renew-loan.error-renew-loan-summary')); })
                    .finally(() => { button.stop(); });
                break;
            }
            case "contact": {
                const bookName = button.getAttribute("data-book-name");
                const subject = i18n.t('renew-loan.contact-subject', {bookName: bookName});

                // open mail client with new mail
                location.href = `mailto:${this.person.email}?subject=${subject}`;
                break;
            }
        }
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

            #renew-loan-block { display: none; }
            form, table {width: 100%}
            
            #no-loans-block{ font-weight: bold; }
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
                        <dbp-organization-select subscribe="lang:lang,entry-point-url:entry-point-url,auth:auth"
                                                                context="library-manager"
                                                                value="${this.organizationId}"
                                                                @change="${this.onOrgUnitCodeChanged}"></dbp-organization-select>
                    </div>
                </div>
                <div class="field">
                    <label class="label">${i18n.t('person-select.headline')}</label>
                    <div class="control">
                        <dbp-person-select subscribe="lang:lang,entry-point-url:entry-point-url,auth:auth"
                                           value="${this.personId}"
                                           organization-id="${this.organizationId}"
                                           show-reload-button
                                           show-details
                                           reload-button-title="${this.person ? i18n.t('renew-loan.button-refresh-title', {personName: this.person.name}): ""}"></dbp-person-select>
                    </div>
                </div>
                <dbp-mini-spinner id="loans-loading" text="${i18n.t('renew-loan.mini-spinner-text')}" style="font-size: 2em; display: none;"></dbp-mini-spinner>
                <div id="renew-loan-block" class="field">
                    <label class="label">${i18n.t('renew-loan.loans')}</label>
                    <div class="control">
                        <dbp-data-table-view searching paging exportable export-name="${i18n.t('renew-loan.loans')}"
                                             subscribe="lang:lang" id="book-loans-1" @click="${(e) => this.onDataTableClick(e)}"></dbp-data-table-view>
                    </div>
                </div>
                <div id="no-loans-block" style="display: none;">
                    ${i18n.t('renew-loan.no-loans')}
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

commonUtils.defineCustomElement('dbp-library-renew-loan', LibraryRenewLoan);
