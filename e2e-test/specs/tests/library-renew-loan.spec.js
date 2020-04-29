import assert from 'assert';
import VPUAppPage from '../../pageObjects/vpu-app.page';
import KeycloakAuthPage from '../../../vendor/e2e-test/pageObjects/keycloak-auth.page';

describe('renew-loan', () => {

	it('should renew the loan for the first book it finds at the institute #F1450 for David Jernej', () => {
        
        //LOGIN

		VPUAppPage.open();

        VPUAppPage.vpuAuthComponent.clickLoginButton();

        KeycloakAuthPage.login(browser.config.username, browser.config.password);
        
        VPUAppPage.vpuApp.waitForExist();

        //LOGIN END

        //Open tab
        const renewLoanTabLink = VPUAppPage.vpuApp.shadow$('[href="/dist/de/renew-loan"]');

        renewLoanTabLink.click(true);

        const renewLoanTab = VPUAppPage.vpuApp.shadow$('vpu-library-renew-loan');

        renewLoanTab.waitForExist();

        const tabForm = renewLoanTab.shadow$('form');

        //Wait for the form to be shown
        browser.waitUntil(function(){
            return tabForm.getAttribute('class') !== 'hidden';
        }, 60000, 'The form has not been shown');

        const personSelect = renewLoanTab.$(function(){
            return Array.from(this.shadowRoot.querySelectorAll('*')).filter(el => el.tagName.toLowerCase().startsWith('vpu-person-select'));
        });

        //Enter person name
        const select2Person = personSelect.shadow$('select');

        browser.execute(function (select2Person) {
            select2Person.focus();
        }, select2Person);

        browser.keys(['Enter']);

        browser.keys('David Jernej');

        const select2PersonResult = personSelect.shadow$('#person-select-dropdown').$('.select2-results__option--highlighted');

        select2PersonResult.waitForExist(30000);

        browser.keys(['Enter']);

        //Loading table
        const spinner = renewLoanTab.$(function(){
            return Array.from(this.shadowRoot.querySelectorAll('*')).filter(el => el.tagName.toLowerCase().startsWith('vpu-mini-spinner'));
        });

        browser.waitUntil(function(){
            return spinner.getCSSProperty('display').value === 'none';
        }, 60000, 'The loading spinner is still visible');

        //Check if no books are loaned
        const dataTableView = renewLoanTab.$(function(){
            return Array.from(this.shadowRoot.querySelectorAll('*')).filter(el => el.tagName.toLowerCase().startsWith('vpu-data-table-view'));
        });

        const firstBook = dataTableView.shadow$('tbody').$('td');

        if (firstBook.getText() === 'Keine Daten in der Tabelle vorhanden') {
            assert.ok(true);
        }
        else {
            //Search for the book
            const searchField = dataTableView.shadow$('[type="search"]');

            searchField.setValue(firstBook.getText());

            //Change date
            const dateField = dataTableView.shadow$('[type="date"]');

            browser.execute(function (dateField) {
                dateField.setAttribute('value', '2030-01-01');
            }, dateField);

            //Send
            const sendButton = dataTableView.$(function(){
                return Array.from(this.shadowRoot.querySelectorAll('*')).filter(el => el.tagName.toLowerCase().startsWith('vpu-button'));
            }).shadow$('button');

            sendButton.click(true);

            //Notification
            const notificationHeading = VPUAppPage.vpuApp.$(function(){
                return Array.from(this.shadowRoot.querySelectorAll('*')).filter(el => el.tagName.toLowerCase().startsWith('vpu-notification'));
            }).shadow$('h3');

            notificationHeading.waitForExist(30000, false, 'The notification does not exist');

            assert.strictEqual(notificationHeading.getText(),'Verlängern erfolgreich');
        }
    });

    //Negative test
    it('should fail while searching for a loan using a book name that does not exist at the institute #F1450 for David Jernej', () => {

        browser.reloadSession();

        //LOGIN

		VPUAppPage.open();

        VPUAppPage.vpuAuthComponent.clickLoginButton();

        KeycloakAuthPage.login(browser.config.username, browser.config.password);
        
        VPUAppPage.vpuApp.waitForExist();

        //LOGIN END

        //Open tab
        const renewLoanTabLink = VPUAppPage.vpuApp.shadow$('[href="/dist/de/renew-loan"]');

        renewLoanTabLink.click(true);

        const renewLoanTab = VPUAppPage.vpuApp.shadow$('vpu-library-renew-loan');

        renewLoanTab.waitForExist();

        const tabForm = renewLoanTab.shadow$('form');

        //Wait for the form to be shown
        browser.waitUntil(function(){
            return tabForm.getAttribute('class') !== 'hidden';
        }, 60000, 'The form has not been shown');

        const personSelect = renewLoanTab.$(function(){
            return Array.from(this.shadowRoot.querySelectorAll('*')).filter(el => el.tagName.toLowerCase().startsWith('vpu-person-select'));
        });

        //Enter person name
        const select2Person = personSelect.shadow$('select');

        browser.execute(function (select2Person) {
            select2Person.focus();
        }, select2Person);

        browser.keys(['Enter']);

        browser.keys('David Jernej');

        const select2PersonResult = personSelect.shadow$('#person-select-dropdown').$('.select2-results__option--highlighted');

        select2PersonResult.waitForExist(30000);

        browser.keys(['Enter']);

        //Loading table
        const spinner = renewLoanTab.$(function(){
            return Array.from(this.shadowRoot.querySelectorAll('*')).filter(el => el.tagName.toLowerCase().startsWith('vpu-mini-spinner'));
        });

        browser.waitUntil(function(){
            return spinner.getCSSProperty('display').value === 'none';
        }, 60000, 'The loading spinner is still visible');

        //Check if no books are loaned
        const dataTableView = renewLoanTab.$(function(){
            return Array.from(this.shadowRoot.querySelectorAll('*')).filter(el => el.tagName.toLowerCase().startsWith('vpu-data-table-view'));
        });

        const fakeBookName = 'XXXXXXXXXXXXXXXXXXXX';

        //Search for the book
        const searchField = dataTableView.shadow$('[type="search"]');

        searchField.setValue(fakeBookName);

        const errorMsg = dataTableView.shadow$('tbody').$('td').getText(); 

        if(errorMsg === 'Keine Daten in der Tabelle vorhanden'){
            assert.ok(true);
        }
        else {
            assert.strictEqual(errorMsg,'Keine Einträge vorhanden');
        }
    });
});