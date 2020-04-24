import assert from 'assert';
import VPUAppPage from '../../pageObjects/vpu-app.page';
import KeycloakAuthPage from '../../../vendor/e2e-test/pageObjects/keycloak-auth.page';

describe('shelving', () => {
	
	it('should return a book with the barcode +F4637604 at the institute #F1450', () => {
        
        //LOGIN

		VPUAppPage.open();

        VPUAppPage.vpuAuthComponent.clickLoginButton();

        KeycloakAuthPage.login(browser.config.username, browser.config.password);
        
        VPUAppPage.vpuApp.waitForExist();

        //LOGIN END

        //Open tab
        const returnBookTabLink = VPUAppPage.vpuApp.shadow$('[href="/dist/de/return-book"]');

        returnBookTabLink.click(true);

        const returnBookTab = VPUAppPage.vpuApp.shadow$('vpu-library-return-book');

        returnBookTab.waitForExist();

        browser.pause(8000);

        const bookOfferSelect = returnBookTab.shadow$('[organization-id]');

        bookOfferSelect.waitForExist();

        //Enter book name
        const select2 = bookOfferSelect.shadow$('[name="book-offer"]');

        select2.waitForExist();

        browser.execute(function (select2) {
            select2.focus();
        }, select2);

        browser.keys(['Enter']);

        browser.keys('F4637604');

        browser.pause(8000);

        browser.keys(['Enter']);
        
        //Send
        const sendButton = returnBookTab.shadow$('[value="Buch zurückgeben"]');

        sendButton.waitForExist();

        sendButton.click(true);
        
        browser.pause(5000);

        //Notification
        const notificationHeading = returnBookTab.shadow$('h4');

        assert.strictEqual(notificationHeading.getText(),'Buchrückgabe erfolgreich');
    });
});