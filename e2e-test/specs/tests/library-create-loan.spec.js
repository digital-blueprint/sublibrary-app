import assert from 'assert';
import VPUAppPage from '../../pageObjects/vpu-app.page';
import KeycloakAuthPage from '../../../vendor/e2e-test/pageObjects/keycloak-auth.page';

describe('shelving', () => {
	
	it('should create a loan with the barcode +F4637604 at the institute #F1450 for David Jernej', () => {
        
        //LOGIN

		VPUAppPage.open();

        VPUAppPage.vpuAuthComponent.clickLoginButton();

        KeycloakAuthPage.login(browser.config.username, browser.config.password);
        
        VPUAppPage.vpuApp.waitForExist();

        //LOGIN END

        //Open tab
        const createLoanTabLink = VPUAppPage.vpuApp.shadow$('[href="/dist/de/create-loan"]');

        createLoanTabLink.click(true);

        const createLoanTab = VPUAppPage.vpuApp.shadow$('vpu-library-create-loan');

        createLoanTab.waitForExist();

        browser.pause(8000);

        const personSelect = createLoanTab.shadow$('[show-birth-date]');

        personSelect.waitForExist();

        const bookOfferSelect = createLoanTab.shadow$('[organization-id]');

        bookOfferSelect.waitForExist();

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

        //Enter book name
        const select2Book = bookOfferSelect.shadow$('[name="book-offer"]');

        select2Book.waitForExist();

        browser.execute(function (select2Book) {
            select2Book.focus();
        }, select2Book);

        browser.keys(['Enter']);

        browser.keys('F4637604');

        browser.pause(8000);

        browser.keys(['Enter']);

        browser.pause(8000);

        //Notification
        const notificationHeading = createLoanTab.shadow$('h4');
        
        notificationHeading.waitForExist();

        if (notificationHeading.getText() === 'Bestehende Entlehnung!') {
            assert.ok(true);
        }
        else {
            //Send
            const sendButton = createLoanTab.shadow$('[value="Buch entlehnen"]');

            sendButton.waitForExist();

            sendButton.click(true);
            
            browser.pause(20000);

            //Notification
            const notificationHeading = createLoanTab.shadow$('h4');

            assert.strictEqual(notificationHeading.getText(),'Buchentlehnung erfolgreich');
        }
    });
});