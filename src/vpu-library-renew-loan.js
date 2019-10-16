import $ from 'jquery';
import {i18n} from './i18n.js';
import {css, html} from 'lit-element';
import {send as notify} from 'vpu-notification';
import VPULitElementJQuery from 'vpu-common/vpu-lit-element-jquery';
import 'vpu-language-select';
import * as commonUtils from 'vpu-common/utils';
import * as commonStyles from 'vpu-common/styles';
import 'vpu-data-table-view';
import * as errorUtils from "vpu-common/error";

class LibraryRenewLoan extends VPULitElementJQuery {
    constructor() {
        super();
        this.lang = 'de';
        this.entryPointUrl = commonUtils.getAPiUrl();
        this.personId = "";
        this.person = null;
        this.loans = [];
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
        };
    }

    connectedCallback() {
        super.connectedCallback();
        const that = this;

        this.updateComplete.then(()=>{
            // language=css
            const css = `
                @media (min-width: 900px) {
                    td .date-col {
                        white-space: nowrap;
                    }
                }
    
                @media (max-width: 900px) {
                    td .date-col input[type="time"] {
                        margin-top: 5px;
                    }
                }

                table.dataTable thead th, table.dataTable thead td { padding: 10px; }
            `;

            this._("vpu-data-table-view").setCSSStyle(css);
            const $personSelect = that.$('vpu-person-select');
            const $renewLoanBlock = that.$('#renew-loan-block');
            const $noLoansBlock = that.$('#no-loans-block');
            const $loansLoadingIndicator = that.$('#loans-loading');

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

            // show loan list block if person was selected
            $personSelect.change(function () {
                that.person = $(this).data("object");
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
                            const tbl = [];
                            that.loans.forEach(function(loan) {
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
                                    `<vpu-button data-id="${loan['@id']}"
                                                 value="Ok" name="send" type="is-small"
                                                 title="${i18n.t('renew-loan.renew-loan')}" no-spinner-on-click></vpu-button>`
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
            }).on('unselect', function (e) {
                $renewLoanBlock.hide();
            });
        });
    }

    update(changedProperties) {
        changedProperties.forEach((oldValue, propName) => {
            if (propName === "lang") {
                i18n.changeLanguage(this.lang);
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
            }
        });

        super.update(changedProperties);
    }

    onLanguageChanged(e) {
        this.lang = e.detail.lang;
    }

    execRenew(e) {
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

        button.start();
        const loanId = button.getAttribute("data-id");
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
    }

    static get styles() {
        // language=css
        return css`
            ${commonStyles.getThemeCSS()}
            ${commonStyles.getGeneralCSS()}

            #renew-loan-block, #permission-error-block { display: none; }
            form, table {width: 100%}
        `;
    }

    render() {
        return html`
            <form class="hidden">
                <div class="field">
                    <label class="label">${i18n.t('person-select.headline')}</label>
                    <div class="control">
                        <vpu-person-select entry-point-url="${this.entryPointUrl}" lang="${this.lang}" value="${this.personId}"></vpu-person-select>
                    </div>
                </div>
                <vpu-mini-spinner id="loans-loading" style="font-size: 2em; display: none;"></vpu-mini-spinner>
                <div id="renew-loan-block" class="field">
                    <label class="label">${i18n.t('renew-loan.loans')}</label>
                    <div class="control">
                        <vpu-data-table-view searching paging lang="${this.lang}" id="book-loans-1" columns-count="4" @click="${(e) => this.execRenew(e)}"></vpu-data-table-view>
                    </div>
                </div>
                <div id="no-loans-block" style="display: none">
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
