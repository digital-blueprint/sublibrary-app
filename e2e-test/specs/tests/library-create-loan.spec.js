import assert from 'assert';
import VPUAppPage from '../../pageObjects/vpu-app.page';
import KeycloakAuthPage from '../../../vendor/e2e-test/pageObjects/keycloak-auth.page';

describe('create-loan', () => {
	
	it('should create a loan with the barcode +F4637604 at the institute #F1450 for "David Jernej"', () => {
        
        //LOGIN

		VPUAppPage.open();

        VPUAppPage.vpuAuthComponent.clickLoginButton();

        KeycloakAuthPage.login(browser.config.username, browser.config.password);
        
        VPUAppPage.vpuApp.waitForExist();

        //LOGIN END

        //Open tab
        const createLoanTabLink = VPUAppPage.vpuApp.shadow$('[href="/dist/de/create-loan"]');

        createLoanTabLink.waitForExist();

        createLoanTabLink.click(true);

        const createLoanTab = VPUAppPage.vpuApp.shadow$('vpu-library-create-loan');

        createLoanTab.waitForExist();
        
        const tabForm = createLoanTab.shadow$('form');

        //Wait for the form to be shown
        browser.waitUntil(function(){
            return tabForm.getAttribute('class') !== 'hidden';
        }, 60000, 'The form has not been shown');

        const personSelect = createLoanTab.$(function(){
            return Array.from(this.shadowRoot.querySelectorAll('*')).filter(el => el.tagName.toLowerCase().startsWith('vpu-person-select'));
        });

        const bookOfferSelect = createLoanTab.$(function(){
            return Array.from(this.shadowRoot.querySelectorAll('*')).filter(el => el.tagName.toLowerCase().startsWith('vpu-library-book-offer-select'));
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
        const spinner = createLoanTab.$(function(){
            return Array.from(this.shadowRoot.querySelectorAll('*')).filter(el => el.tagName.toLowerCase().startsWith('vpu-mini-spinner'));
        });

        browser.waitUntil(function(){
            return spinner.getCSSProperty('display').value === 'none';
        }, 30000, 'The loading spinner is still visible');

        //Notification
        const notificationHeading = createLoanTab.shadow$('h4');

        if (notificationHeading.getText() === 'Bestehende Entlehnung!') {
            assert.ok(true);
        }
        else {
            //Send
            const sendButton = createLoanTab.$(function(){
                return Array.from(this.shadowRoot.querySelectorAll('*')).filter(el => el.tagName.toLowerCase().startsWith('vpu-button'));
            }).shadow$('button');

            sendButton.click(true);

            //Notification
            const notificationHeading = createLoanTab.shadow$('form').$('h4=Buchentlehnung erfolgreich');

            notificationHeading.waitForExist(30000, false, 'The notification does not exist');

            assert.ok(true);
        }
    });

    //Negative Test
    it('should fail finding the person "David Jernejjjjjj" while creating a loan', () => {

        browser.reloadSession();

        //LOGIN

        VPUAppPage.open();

        VPUAppPage.vpuAuthComponent.clickLoginButton();

        KeycloakAuthPage.login(browser.config.username, browser.config.password);

        VPUAppPage.vpuApp.waitForExist();

        //Open tab
        const createLoanTabLink = VPUAppPage.vpuApp.shadow$('[href="/dist/de/create-loan"]');

        createLoanTabLink.waitForExist();

        createLoanTabLink.click(true);

        const createLoanTab = VPUAppPage.vpuApp.shadow$('vpu-library-create-loan');

        createLoanTab.waitForExist();

        const tabForm = createLoanTab.shadow$('form');

        //Wait for the form to be shown
        browser.waitUntil(function(){
            return tabForm.getAttribute('class') !== 'hidden';
        }, 60000, 'The form has not been shown');

        const personSelect = createLoanTab.$(function(){
            return Array.from(this.shadowRoot.querySelectorAll('*')).filter(el => el.tagName.toLowerCase().startsWith('vpu-person-select'));
        });

        //Enter person name
        const select2Person = personSelect.shadow$('select');

        browser.execute(function (select2Person) {
            select2Person.focus();
        }, select2Person);

        browser.keys(['Enter']);

        browser.keys('David Jernejjjjjj');

        const select2PersonResult = personSelect.shadow$('#person-select-dropdown').$('.select2-results__message');

        select2PersonResult.waitForExist(30000);

        assert.strictEqual(select2PersonResult.getText(), 'Keine Übereinstimmungen gefunden');
    });
});