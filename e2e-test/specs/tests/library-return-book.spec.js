import assert from 'assert';
import VPUAppPage from '../../pageObjects/vpu-app.page';
import KeycloakAuthPage from '../../../vendor/e2e-test/pageObjects/keycloak-auth.page';

describe('return-book', () => {
	
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

        const tabForm = returnBookTab.shadow$('form');

        //Wait for the form to be shown
        browser.waitUntil(function(){
            return tabForm.getAttribute('class') !== 'hidden';
        }, 60000, 'The form has not been shown');

        const bookOfferSelect = returnBookTab.$(function(){
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

        //Loading
        const spinner = returnBookTab.$(function(){
            return Array.from(this.shadowRoot.querySelectorAll('*')).filter(el => el.tagName.toLowerCase().startsWith('vpu-mini-spinner'));
        });

        browser.waitUntil(function(){
            return spinner.getCSSProperty('display').value === 'none';
        }, 30000, 'The loading spinner is still visible');

        //Check if there is no loan
        const notificationHeading = returnBookTab.shadow$('form').$('.notification').$('h4');

        if (notificationHeading.getText() === 'Keine bestehenden Entlehnungen') {
            assert.ok(true);
        }
        else{
            //Send
            const sendButton = returnBookTab.$(function(){
                return Array.from(this.shadowRoot.querySelectorAll('*')).filter(el => el.tagName.toLowerCase().startsWith('vpu-button'));
            }).shadow$('button');

            sendButton.click(true);

            //Notification
            const notificationHeading = returnBookTab.shadow$('form').$('h4=Buchrückgabe erfolgreich');

            notificationHeading.waitForExist(30000, false, 'The notification does not exist');

            assert.ok(true);
        }
    });

    //Negative Test
    it('should fail finding the institute #FXXXX while returning a book', () => {

        browser.reloadSession();

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

        const tabForm = returnBookTab.shadow$('form');

        //Wait for the form to be shown
        browser.waitUntil(function(){
            return tabForm.getAttribute('class') !== 'hidden';
        }, 60000, 'The form has not been shown');

        const organizationSelect = returnBookTab.$(function(){
            return Array.from(this.shadowRoot.querySelectorAll('*')).filter(el => el.tagName.toLowerCase().startsWith('vpu-knowledge-base-organization-select'));
        });

        //Wait for the organization to be loaded
        const organizationSelectPlaceholder = organizationSelect.shadow$('.select2-selection__placeholder');

        organizationSelectPlaceholder.waitForExist(30000, true, 'Organizations are still loading');

        //Enter organization name
        const select2OrganizationFocusElement = organizationSelect.shadow$('.select2-container').$('.select2-selection--single');

        browser.execute(function (select2OrganizationFocusElement) {
            select2OrganizationFocusElement.focus();
        }, select2OrganizationFocusElement);

        browser.keys(['Enter']);

        browser.keys('#FXXXX');

        const select2OrganizationResult = organizationSelect.shadow$('#select-organization-dropdown').$('.select2-results__message');

        select2OrganizationResult.waitForExist(30000);

        assert.strictEqual(select2OrganizationResult.getText(), 'Keine Übereinstimmungen gefunden');
    });
});