import assert from 'assert';
import VPUAppPage from '../../pageObjects/vpu-app.page';
import KeycloakAuthPage from '../../../vendor/e2e-test/pageObjects/keycloak-auth.page';
import * as fs from 'fs';
import * as path from 'path';

describe('book-list', () => {

    const downloadFolder = '/mnt/c/users/David Jernej/Downloads';

    //Delete files from the download folder
    before(function() {
        fs.readdirSync(downloadFolder).forEach(file => {
            fs.unlink(path.join(downloadFolder, file), err => {
                if (err) throw err;
            });
        });
    });

	it('should open the book list and download the excel file at institute #F1450', () => {

        //LOGIN

        VPUAppPage.open();

        VPUAppPage.vpuAuthComponent.clickLoginButton();

        KeycloakAuthPage.login(browser.config.username, browser.config.password);
        
        VPUAppPage.vpuApp.waitForExist();

        //LOGIN END

        const bookListTabLink = VPUAppPage.vpuApp.shadow$('[href="/dist/de/book-list"]');

        bookListTabLink.waitForExist();

        bookListTabLink.click(true);

        const bookListTab = VPUAppPage.vpuApp.shadow$('vpu-library-book-list');

        bookListTab.waitForExist();

        const tabForm = bookListTab.shadow$('form');

        //Wait for the form to be shown
        browser.waitUntil(function(){
            return tabForm.getAttribute('class') !== 'hidden';
        }, 60000, 'The form has not been shown');

        //Wait until the organization select finished loading
        const organizationSelect = bookListTab.$(function(){
            return Array.from(this.shadowRoot.querySelectorAll('*')).filter(el => el.tagName.toLowerCase().startsWith('vpu-knowledge-base-organization-select'));
        });

        const organizationSelectPlaceholder = organizationSelect.shadow$('.select2-selection__placeholder');

        organizationSelectPlaceholder.waitForExist(30000, true, 'Organizations are still loading');

        //Loading table
        const spinner = bookListTab.$(function(){
            return Array.from(this.shadowRoot.querySelectorAll('*')).filter(el => el.tagName.toLowerCase().startsWith('vpu-mini-spinner'));
        });

        browser.waitUntil(function(){
            return spinner.getCSSProperty('display').value === 'none';
        }, 60000, 'The loading spinner is still visible');

        const dataTableView = bookListTab.$(function(){
            return Array.from(this.shadowRoot.querySelectorAll('*')).filter(el => el.tagName.toLowerCase().startsWith('vpu-data-table-view'));
        });

        const excelExportButton = dataTableView.shadow$('.buttons-excel');

        excelExportButton.click(true);

        const organizationSelectAlternateName = JSON.parse(organizationSelect.getAttribute('data-object')).alternateName;

        const downloadFileName = 'Buchliste ' + organizationSelectAlternateName + '.xlsx';

        browser.waitUntil(function(){
            return fs.existsSync(path.join(downloadFolder, downloadFileName));
        }, 30000, 'The file has not been downloaded yet');

        assert.ok(true);
    });


    //Negative test
    it('should open the book list at institute #F1450 and fail while searching the location XXXXXXXXX', () => {

        browser.reloadSession();

        //LOGIN

        VPUAppPage.open();

        VPUAppPage.vpuAuthComponent.clickLoginButton();

        KeycloakAuthPage.login(browser.config.username, browser.config.password);
        
        VPUAppPage.vpuApp.waitForExist();

        //LOGIN END

        const bookListTabLink = VPUAppPage.vpuApp.shadow$('[href="/dist/de/book-list"]');

        bookListTabLink.waitForExist();

        bookListTabLink.click(true);

        const bookListTab = VPUAppPage.vpuApp.shadow$('vpu-library-book-list');

        bookListTab.waitForExist();

        const tabForm = bookListTab.shadow$('form');

        //Wait for the form to be shown
        browser.waitUntil(function(){
            return tabForm.getAttribute('class') !== 'hidden';
        }, 60000, 'The form has not been shown');

        //Wait until the organization select finished loading
        const organizationSelect = bookListTab.$(function(){
            return Array.from(this.shadowRoot.querySelectorAll('*')).filter(el => el.tagName.toLowerCase().startsWith('vpu-knowledge-base-organization-select'));
        });

        const organizationSelectPlaceholder = organizationSelect.shadow$('.select2-selection__placeholder');

        organizationSelectPlaceholder.waitForExist(30000, true, 'Organizations are still loading');

        //Loading table
        const spinner = bookListTab.$(function(){
            return Array.from(this.shadowRoot.querySelectorAll('*')).filter(el => el.tagName.toLowerCase().startsWith('vpu-mini-spinner'));
        });

        browser.waitUntil(function(){
            return spinner.getCSSProperty('display').value === 'none';
        }, 60000, 'The loading spinner is still visible');

        const select2Location = bookListTab.shadow$('#book-list-block').$('select');

        browser.execute(function (select2Location) {
            select2Location.focus();
        }, select2Location);

        browser.keys(['Enter']);

        browser.keys('XXXXXXXXX');

        const select2LocationResult = bookListTab.shadow$('#book-list-block').shadow$('#location-identifier-select-dropdown').$('.select2-results__message');

        select2LocationResult.waitForExist(30000);

        assert.strictEqual(select2LocationResult.getText(), 'Keine Übereinstimmungen gefunden');
    });
});