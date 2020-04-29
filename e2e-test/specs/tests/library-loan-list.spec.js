import assert from 'assert';
import VPUAppPage from '../../pageObjects/vpu-app.page';
import KeycloakAuthPage from '../../../vendor/e2e-test/pageObjects/keycloak-auth.page';

describe('loan-list', () => {

    const bookName = 'Stadtatlas München Karten und Modelle von 1570 bis heute';

	it('should show all book loans and search for barcode +F3908440X at institute #F1450', () => {
        
        //LOGIN

		VPUAppPage.open();

        VPUAppPage.vpuAuthComponent.clickLoginButton();

        KeycloakAuthPage.login(browser.config.username, browser.config.password);
        
        VPUAppPage.vpuApp.waitForExist();

        //LOGIN END

        const loanListTabLink = VPUAppPage.vpuApp.shadow$('[href="/dist/de/loan-list"]');

        loanListTabLink.waitForExist();

        loanListTabLink.click(true);

        const loanListTab = VPUAppPage.vpuApp.shadow$('vpu-library-loan-list');

        loanListTab.waitForExist();

        const tabForm = loanListTab.shadow$('form');

        //Wait for the form to be shown
        browser.waitUntil(function(){
            return tabForm.getAttribute('class') !== 'hidden';
        }, 60000, 'The form has not been shown');

        //Wait until the organization select finished loading
        const organizationSelect = loanListTab.$(function(){
            return Array.from(this.shadowRoot.querySelectorAll('*')).filter(el => el.tagName.toLowerCase().startsWith('vpu-knowledge-base-organization-select'));
        });

        const organizationSelectPlaceholder = organizationSelect.shadow$('.select2-selection__placeholder');

        organizationSelectPlaceholder.waitForExist(30000, true, 'Organizations are still loading');

        //Loading table
        const spinner = loanListTab.$(function(){
            return Array.from(this.shadowRoot.querySelectorAll('*')).filter(el => el.tagName.toLowerCase().startsWith('vpu-mini-spinner'));
        });

        browser.waitUntil(function(){
            return spinner.getCSSProperty('display').value === 'none';
        }, 60000, 'The loading spinner is still visible');

        const dataTableView = loanListTab.$(function(){
            return Array.from(this.shadowRoot.querySelectorAll('*')).filter(el => el.tagName.toLowerCase().startsWith('vpu-data-table-view'));
        });

        //Search for barcode
        const searchField = dataTableView.shadow$('[type="search"]');

        searchField.setValue('F3908440X');

        //Validate
        const book = dataTableView.shadow$('td');

        assert.strictEqual(book.getText(), bookName);
    });

    //Negative test
    it('should show all book loans and fail while searching for barcode +XXXXXXXXX at institute #F1450', () => {

        browser.reloadSession();

        //LOGIN

		VPUAppPage.open();

        VPUAppPage.vpuAuthComponent.clickLoginButton();

        KeycloakAuthPage.login(browser.config.username, browser.config.password);
        
        VPUAppPage.vpuApp.waitForExist();

        //LOGIN END

        const loanListTabLink = VPUAppPage.vpuApp.shadow$('[href="/dist/de/loan-list"]');

        loanListTabLink.waitForExist();

        loanListTabLink.click(true);

        const loanListTab = VPUAppPage.vpuApp.shadow$('vpu-library-loan-list');

        loanListTab.waitForExist();

        const tabForm = loanListTab.shadow$('form');

        //Wait for the form to be shown
        browser.waitUntil(function(){
            return tabForm.getAttribute('class') !== 'hidden';
        }, 60000, 'The form has not been shown');

        //Wait until the organization select finished loading
        const organizationSelect = loanListTab.$(function(){
            return Array.from(this.shadowRoot.querySelectorAll('*')).filter(el => el.tagName.toLowerCase().startsWith('vpu-knowledge-base-organization-select'));
        });

        const organizationSelectPlaceholder = organizationSelect.shadow$('.select2-selection__placeholder');

        organizationSelectPlaceholder.waitForExist(30000, true, 'Organizations are still loading');

        //Loading table
        const spinner = loanListTab.$(function(){
            return Array.from(this.shadowRoot.querySelectorAll('*')).filter(el => el.tagName.toLowerCase().startsWith('vpu-mini-spinner'));
        });

        browser.waitUntil(function(){
            return spinner.getCSSProperty('display').value === 'none';
        }, 60000, 'The loading spinner is still visible');

        const dataTableView = loanListTab.$(function(){
            return Array.from(this.shadowRoot.querySelectorAll('*')).filter(el => el.tagName.toLowerCase().startsWith('vpu-data-table-view'));
        });

        const fakeBarcode = 'XXXXXXXXXX';

        //Search for the book
        const searchField = dataTableView.shadow$('[type="search"]');

        searchField.setValue(fakeBarcode);

        const errorMsg = dataTableView.shadow$('tbody').$('td').getText(); 

        if(errorMsg === 'Keine Daten in der Tabelle vorhanden'){
            assert.ok(true);
        }
        else {
            assert.strictEqual(errorMsg,'Keine Einträge vorhanden');
        }
    });
});