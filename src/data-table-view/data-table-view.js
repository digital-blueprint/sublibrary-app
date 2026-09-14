/// <reference path="./datatables.d.ts" />

import $ from 'jquery';
import dt from 'datatables.net';
import resp from 'datatables.net-responsive';
import resp2 from 'datatables.net-responsive-dt';
import jszip from 'jszip/dist/jszip.js';
import bttn from 'datatables.net-buttons-dt';
import bttn2 from 'datatables.net-buttons';
import bttnHtml5 from 'datatables.net-buttons/js/buttons.html5.js';
import bttnPrint from 'datatables.net-buttons/js/buttons.print.js';
import {createInstance} from '../i18n.js';
import {css, html} from 'lit';
import de from './i18n/German.json';
import en from './i18n/English.json';
import * as commonUtils from '@dbp-toolkit/common/utils';
import * as commonStyles from '@dbp-toolkit/common/styles';
import {name as pkgName} from '../../package.json';
import {AdapterLitElement} from '@dbp-toolkit/common';

/**
 * @typedef {((selector: Element | null) => JQuery) & {
 *   fn: {dataTable: {Responsive: new (table: unknown, options: {details: boolean}) => unknown}}
 * }} DataTablesJQuery
 */

const jquery = /** @type {DataTablesJQuery} */ (/** @type {unknown} */ ($));

/** @type {DataTablesFactory} */ (/** @type {unknown} */ (dt))(window, jquery);
resp(window, jquery);
resp2(window, jquery);
bttn(window, jquery);
bttn2(window, jquery);
bttnHtml5(window, jquery, jszip);
bttnPrint(window, jquery);

export class DataTableView extends AdapterLitElement {
    constructor() {
        super();
        this._i18n = createInstance();
        this.lang = this._i18n.language;
        // datatable properties
        this.table = null;
        this.responsive = null;
        this.paging = false;
        this.searching = false;
        this.columns = [];
        this.columnDefs = [];
        this.data = [];
        this.cssStyle = '';
        this.exportable = false;
        this.exportName = 'Data Export';
        this.columnSearching = false;
        this.defaultOrder = [];
    }

    setCSSStyle(style) {
        this.cssStyle = style;
    }

    static get properties() {
        return {
            ...super.properties,
            lang: {type: String},
            table: {type: Object, attribute: false},
            paging: {type: Boolean},
            searching: {type: Boolean},
            columns: {type: Array, attribute: false},
            columnDefs: {type: Array, attribute: false},
            data: {type: Array, attribute: false},
            cssStyle: {type: String, attribute: false},
            exportable: {type: Boolean},
            exportName: {type: String, attribute: 'export-name'},
            columnSearching: {type: Boolean, attribute: 'column-searching'},
            defaultOrder: {type: Array, attribute: 'default-order'},
        };
    }

    set_columns(cols) {
        this.columns = cols;
        return this;
    }
    set_columnDefs(defs) {
        this.columnDefs = defs;
        return this;
    }
    set_defaultOrder(order) {
        this.defaultOrder = order;
        return this;
    }
    getTable() {
        if (this.table === null) {
            throw new Error('data table is not initialized');
        }
        return this.table;
    }
    add_row(row) {
        this.data.push(row);
        this.getTable().row.add(row);
        return this;
    }
    draw() {
        this.getTable().draw();
        return this;
    }
    columnSearch(col, str) {
        this.getTable().column(col).search(str).draw();
    }
    columnReduce(col, func, init = 0) {
        return this.getTable().column(col, {search: 'applied'}).data().reduce(func, init);
    }
    on(eventName, func) {
        this.getTable().on(eventName, func);
        return this;
    }

    set_datatable(data, languageChange = false) {
        const lang_obj = this.lang === 'de' ? de : en;
        const i18n = this._i18n;

        if (typeof this.columns === 'undefined' || !this.columns.length) {
            if (data.length) throw new Error('columns not set-up');
            return this;
        }

        if (this.columnSearching) {
            const existing_tfoot = this.renderRoot.querySelector('table tfoot');
            if (existing_tfoot === null || !existing_tfoot.hasChildNodes() || languageChange) {
                if (existing_tfoot !== null) {
                    existing_tfoot.remove();
                }

                const fragment = document.createDocumentFragment();
                const tfoot = document.createElement('tfoot');
                const tr = document.createElement('tr');
                this.columns.forEach(function (element, index) {
                    const th = document.createElement('td');
                    if (
                        element !== null &&
                        (typeof element.visible === 'undefined' || element.visible !== false) &&
                        (typeof element.searchable === 'undefined' || element.searchable !== false)
                    ) {
                        const input = document.createElement('input');
                        input.type = 'text';
                        input.className = 'column-search-line';
                        input.id = 'input-col-' + index;
                        input.placeholder = i18n.t('data-table-view.column-search-placeholder', {
                            fieldName: element.title,
                        });
                        th.appendChild(input);
                    }
                    tr.appendChild(th);
                });
                tfoot.appendChild(tr);
                fragment.appendChild(tfoot);
                this.renderRoot.querySelector('table')?.appendChild(fragment);
            }
        }

        const options = /** @type {DataTableSettings} */ ({
            destroy: true,
            autoWidth: true,
            language: lang_obj,
            paging: this.paging,
            searching: this.searching,
            columns: this.columns,
            columnDefs: this.columnDefs,
            dom: (this.exportable ? '<"export-btn"B>' : '') + 'lfrtip',
            buttons: [
                {
                    extend: 'excelHtml5',
                    text: i18n.t('data-table-view.export-excel'),
                    title: this.exportName,
                    filename: this.exportName,
                    className: 'button is-small',
                },
                {
                    extend: 'csvHtml5',
                    text: i18n.t('data-table-view.export-csv'),
                    title: this.exportName,
                    filename: this.exportName,
                    className: 'button is-small',
                    charset: 'UTF-8',
                    bom: true,
                    fieldSeparator: this.lang === 'en' ? ',' : ';',
                },
                {
                    extend: 'print',
                    text: i18n.t('data-table-view.print'),
                    title: this.exportName,
                    className: 'button is-small',
                },
            ],
        });
        this.table = jquery(this.renderRoot.querySelector('table')).DataTable(options);

        const dataTableLength = sessionStorage.getItem('dbp-data-table-length');

        //Retrieve page length from session storage
        if (dataTableLength !== null) {
            this.table.page.len(Number(dataTableLength));
        }

        //Save page length in session storage
        this.table.on('length.dt', function (e, settings, len) {
            sessionStorage.setItem('dbp-data-table-length', len);
        });

        this.data = data;

        this.table.clear();
        if (this.data.length) {
            this.table.rows.add(this.data);
        }

        new jquery.fn.dataTable.Responsive(this.table, {
            details: true,
        });

        if (this.columnSearching) {
            const thisTable = this.table;
            const that = this;
            this.columns.forEach(function (element, index) {
                if (
                    element !== null &&
                    (typeof element.visible === 'undefined' || element.visible !== false) &&
                    (typeof element.searchable === 'undefined' || element.searchable !== false)
                ) {
                    const input = /** @type {HTMLInputElement | null} */ (
                        that.renderRoot.querySelector('#input-col-' + index)
                    );
                    if (input) {
                        ['keyup', 'change', 'clear'].forEach(function (event) {
                            input.addEventListener(event, function () {
                                const column = thisTable.column(index);
                                if (column.search() !== input.value) {
                                    column.search(input.value).draw();
                                }
                            });
                        });
                    }
                }
            });
        }

        this.table.order(this.defaultOrder);
        this.table.draw();

        return this;
    }

    update(changedProperties) {
        let languageChange = false;

        changedProperties.forEach((oldValue, propName) => {
            if (propName === 'lang') {
                this._i18n.changeLanguage(this.lang).catch((e) => {
                    console.log(e);
                });
                languageChange = true;
            }
        });

        this.set_datatable(this.data, languageChange);
        super.update(changedProperties);
    }

    static get styles() {
        // language=css
        const orderExpandIconOverrides = css`
            table.dataTable.dtr-inline.collapsed > tbody > tr > td.dtr-control::before,
            table.dataTable.dtr-inline.collapsed > tbody > tr > th.dtr-control::before {
                all: initial;
                top: 0.7em;
                left: 0.4em;
                height: 1em;
                width: 1em;
                display: block;
                cursor: pointer;
                position: absolute;
                box-sizing: content-box;
                text-align: center;
                text-indent: 0 !important;
                line-height: 0.9em;
                color: var(--dbp-on-primary-surface);
                background-color: var(--dbp-primary-surface);
                content: '+';
            }

            table.dataTable.dtr-inline.collapsed > tbody > tr.parent > td:first-child::before,
            table.dataTable.dtr-inline.collapsed > tbody > tr.parent > th:first-child::before {
                content: '-';
                background-color: var(--dbp-primary-surface);
            }
        `;

        // language=css
        return css`
            ${commonStyles.getThemeCSS()}
            ${commonStyles.getGeneralCSS()}
            ${commonStyles.getButtonCSS()}
            ${orderExpandIconOverrides}

            .dataTables_wrapper .dataTables_paginate .paginate_button.current, .dataTables_wrapper .dataTables_paginate .paginate_button.current:hover {
                color: var(--dbp-muted-text-dark);
                border-radius: var(--dbp-border-radius);
                background: transparent;
            }

            .export-btn {
                margin-bottom: 0.6rem;
            }

            select {
                border-radius: calc(var(--dbp-border-radius) / 2);
                height: 28px;
                margin-left: 3px;
            }

            :host {
                display: block;
            }

            .dataTables_filter input {
                border-radius: 0;
                border:;
                padding: 0.1em;
                color: var(--dbp-content);
            }

            .dataTables_wrapper .dataTables_info {
                color: var(--dbp-content);
            }

            table.dataTable .column-search-line {
                width: 100%;
            }
        `;
    }

    render() {
        let dt_css = commonUtils.getAssetURL(pkgName, 'css/jquery.dataTables.min.css');
        let rs_css = commonUtils.getAssetURL(pkgName, 'css/responsive.dataTables.min.css');
        let bt_css = commonUtils.getAssetURL(pkgName, 'css/buttons.dataTables.min.css');

        return html`
            <link rel="stylesheet" href="${dt_css}" />
            <link rel="stylesheet" href="${rs_css}" />
            <link rel="stylesheet" href="${bt_css}" />
            <style>
                ${this.cssStyle}
            </style>
            <div><table width="100%"></table></div>
        `;
    }
}
