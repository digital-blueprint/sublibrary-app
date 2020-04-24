import assert from 'assert';
import VPUAppPage from '../../pageObjects/vpu-app.page';
import KeycloakAuthPage from '../../../vendor/e2e-test/pageObjects/keycloak-auth.page';

describe('shelving', () => {
	
	it('should shelve a book with the barcode +F4637604 at the institute #F1450', () => {
        
        //LOGIN

		VPUAppPage.open();

        VPUAppPage.vpuAuthComponent.clickLoginButton();

        KeycloakAuthPage.login(browser.config.username, browser.config.password);
        
        VPUAppPage.vpuApp.waitForExist();

        //LOGIN END

        //Open tab
        const shelvingTabLink = VPUAppPage.vpuApp.shadow$('[href="/dist/de/shelving"]');

        shelvingTabLink.click(true);

        const shelvingTab = VPUAppPage.vpuApp.shadow$('vpu-library-shelving');

        shelvingTab.waitForExist();

        browser.pause(8000);

        const bookOfferSelect = shelvingTab.shadow$('[organization-id]');

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
        const sendButton = shelvingTab.shadow$('[value="Abschicken"]');

        sendButton.waitForExist();

        sendButton.click(true);

        browser.pause(1000);

        //Notification
        const notificationHeading = VPUAppPage.vpuApp.shadow$('[lang="de"]').shadow$('h3');

        notificationHeading.waitForExist();

        assert.strictEqual(notificationHeading.getText(),'Buchaufstellung erfolgreich');
    });
});