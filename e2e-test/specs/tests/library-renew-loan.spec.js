import assert from 'assert';
import VPUAppPage from '../../pageObjects/vpu-app.page';
import KeycloakAuthPage from '../../../vendor/e2e-test/pageObjects/keycloak-auth.page';

describe('shelving', () => {
    
    const bookName = '1922, Ausblick auf eine Architektur (Le Corbusier)';

	it('should renew a loan with the barcode +F4637604 at the institute #F1450 for David Jernej', () => {
        
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

        browser.pause(8000);

        const personSelect = renewLoanTab.shadow$('[show-birth-date]');

        personSelect.waitForExist();

        //Enter person name
        const select2Person = personSelect.shadow$('[name="person"]');
        
        select2Person.waitForExist();

        browser.execute(function (select2Person) {
            select2Person.focus();
        }, select2Person);

        browser.keys(['Enter']);

        browser.keys('David Jernej');

        browser.pause(12000);

        browser.keys(['Enter']);

        browser.pause(20000);

        //Check if no books are loaned
        const dataTableView = renewLoanTab.shadow$('#book-loans-1');

        const loanCheck = dataTableView.shadow$('tbody').$('td');

        loanCheck.waitForExist();

        if (loanCheck.getText() === 'Keine Daten in der Tabelle vorhanden') {
            assert.ok(true);
        }
        else {
            //Search for the book
            const searchField = dataTableView.shadow$('[type="search"]');

            searchField.waitForExist();

            searchField.setValue(bookName);

            //Change date
            const dateField = dataTableView.shadow$('[type="date"]');

            dateField.waitForExist();

            browser.execute(function (dateField) {
                dateField.setAttribute('value', '2030-01-01');
            }, dateField);

            //Send
            const sendButton = dataTableView.shadow$('[value="Ok"]');

            sendButton.waitForExist();

            sendButton.click(true);

            browser.pause(15000);

            //Notification
            const notificationHeading = VPUAppPage.vpuApp.shadow$('[lang="de"]').shadow$('h3');

            notificationHeading.waitForExist();

            assert.strictEqual(notificationHeading.getText(),'Verlängern erfolgreich');
        }
    });
});