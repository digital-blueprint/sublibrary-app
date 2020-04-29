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

        shelvingTabLink.waitForExist();

        shelvingTabLink.click(true);

        const shelvingTab = VPUAppPage.vpuApp.shadow$('vpu-library-shelving');

        shelvingTab.waitForExist();

        const tabForm = shelvingTab.shadow$('form');

        //Wait for the form to be shown
        browser.waitUntil(function(){
            return tabForm.getAttribute('class') !== 'hidden';
        }, 60000, 'The form has not been shown');

        const bookOfferSelect = shelvingTab.$(function(){
            return Array.from(this.shadowRoot.querySelectorAll('*')).filter(el => el.tagName.toLowerCase().startsWith('vpu-library-book-offer-select'));
        });
        
        //Enter book name
        const select2Book = bookOfferSelect.shadow$('select');

        browser.execute(function (select2Book) {
            select2Book.focus();
        }, select2Book);

        browser.keys(['Enter']);

        browser.keys('F4637604');

        const select2BookResult = bookOfferSelect.shadow$('#library-book-offer-select-dropdown').$('.select2-results__option--highlighted');

        select2BookResult.waitForExist(30000);

        browser.keys(['Enter']);

        //Send
        const sendButton = shelvingTab.$(function(){
            return Array.from(this.shadowRoot.querySelectorAll('*')).filter(el => el.tagName.toLowerCase().startsWith('vpu-button'));
        }).shadow$('button');

        sendButton.click(true);

        //Notification
        const notificationHeading = VPUAppPage.vpuApp.$(function(){
            return Array.from(this.shadowRoot.querySelectorAll('*')).filter(el => el.tagName.toLowerCase().startsWith('vpu-notification'));
        }).shadow$('h3');

        notificationHeading.waitForExist(30000, false, 'The notification does not exist');

        assert.strictEqual(notificationHeading.getText(),'Buchaufstellung erfolgreich');
    });

    //Negative Test
    it('should fail finding the book +XXXXXXXX while shelving at the institute #F1450', () => {
        
        browser.reloadSession();

        //LOGIN

		VPUAppPage.open();

        VPUAppPage.vpuAuthComponent.clickLoginButton();

        KeycloakAuthPage.login(browser.config.username, browser.config.password);
        
        VPUAppPage.vpuApp.waitForExist();

        //LOGIN END

        //Open tab
        const shelvingTabLink = VPUAppPage.vpuApp.shadow$('[href="/dist/de/shelving"]');

        shelvingTabLink.waitForExist();

        shelvingTabLink.click(true);

        const shelvingTab = VPUAppPage.vpuApp.shadow$('vpu-library-shelving');

        shelvingTab.waitForExist();

        const tabForm = shelvingTab.shadow$('form');

        //Wait for the form to be shown
        browser.waitUntil(function(){
            return tabForm.getAttribute('class') !== 'hidden';
        }, 60000, 'The form has not been shown');

        const bookOfferSelect = shelvingTab.$(function(){
            return Array.from(this.shadowRoot.querySelectorAll('*')).filter(el => el.tagName.toLowerCase().startsWith('vpu-library-book-offer-select'));
        });
        
        //Enter book name
        const select2Book = bookOfferSelect.shadow$('select');

        browser.execute(function (select2Book) {
            select2Book.focus();
        }, select2Book);

        browser.keys(['Enter']);

        browser.keys('XXXXXXXX');

        const select2BookResult = bookOfferSelect.shadow$('#library-book-offer-select-dropdown').$('.select2-results__message');

        select2BookResult.waitForExist(30000);

        assert.strictEqual(select2BookResult.getText(), 'Keine Übereinstimmungen gefunden');
    });
});