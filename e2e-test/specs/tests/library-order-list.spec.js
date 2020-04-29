import assert from 'assert';
import VPUAppPage from '../../pageObjects/vpu-app.page';
import KeycloakAuthPage from '../../../vendor/e2e-test/pageObjects/keycloak-auth.page';

describe('shelving', () => {

	it('should filter the order list after order number for institute #F1450', () => {
        
        //LOGIN

		VPUAppPage.open();

        VPUAppPage.vpuAuthComponent.clickLoginButton();

        KeycloakAuthPage.login(browser.config.username, browser.config.password);
        
        VPUAppPage.vpuApp.waitForExist();

        //LOGIN END

        const orderListTabLink = VPUAppPage.vpuApp.shadow$('[href="/dist/de/order-list"]');

        orderListTabLink.waitForExist();

        orderListTabLink.click(true);

        const orderListTab = VPUAppPage.vpuApp.shadow$('vpu-library-order-list');

        orderListTab.waitForExist();

        const tabForm = orderListTab.shadow$('form');

        //Wait for the form to be shown
        browser.waitUntil(function(){
            return tabForm.getAttribute('class') !== 'hidden';
        }, 60000, 'The form has not been shown');


        //Wait until the organization select finished loading
        const organizationSelect = orderListTab.$(function(){
            return Array.from(this.shadowRoot.querySelectorAll('*')).filter(el => el.tagName.toLowerCase().startsWith('vpu-knowledge-base-organization-select'));
        });

        const organizationSelectPlaceholder = organizationSelect.shadow$('.select2-selection__placeholder');

        organizationSelectPlaceholder.waitForExist(30000, true, 'Organizations are still loading');

        //Loading table
        const spinner = orderListTab.$(function(){
            return Array.from(this.shadowRoot.querySelectorAll('*')).filter(el => el.tagName.toLowerCase().startsWith('vpu-mini-spinner'));
        });

        browser.waitUntil(function(){
            return spinner.getCSSProperty('display').value === 'none';
        }, 60000, 'The loading spinner is still visible');

        const dataTableView = orderListTab.$(function(){
            return Array.from(this.shadowRoot.querySelectorAll('*')).filter(el => el.tagName.toLowerCase().startsWith('vpu-data-table-view'));
        });

        const orderNumber = dataTableView.shadow$('tbody').$('tr').$$('td')[4].getText();

        //Filter by order number 
        const orderNumberSearchField = dataTableView.shadow$('#input-col-5');

        orderNumberSearchField.setValue(orderNumber);
            
        //Validate
        const orderNumberCheckElement = dataTableView.shadow$('tbody').$('tr').$$('td')[4];

        orderNumberCheckElement.waitForExist();

        assert.strictEqual(orderNumberCheckElement.getText(), orderNumber);
    });

    it('should fail while filtering the order list after a non existing order number for institute #F1450', () => {

        browser.reloadSession();

        //LOGIN

		VPUAppPage.open();

        VPUAppPage.vpuAuthComponent.clickLoginButton();

        KeycloakAuthPage.login(browser.config.username, browser.config.password);
        
        VPUAppPage.vpuApp.waitForExist();

        //LOGIN END

        const orderListTabLink = VPUAppPage.vpuApp.shadow$('[href="/dist/de/order-list"]');

        orderListTabLink.waitForExist();

        orderListTabLink.click(true);

        const orderListTab = VPUAppPage.vpuApp.shadow$('vpu-library-order-list');

        orderListTab.waitForExist();

        const tabForm = orderListTab.shadow$('form');

        //Wait for the form to be shown
        browser.waitUntil(function(){
            return tabForm.getAttribute('class') !== 'hidden';
        }, 60000, 'The form has not been shown');


        //Wait until the organization select finished loading
        const organizationSelect = orderListTab.$(function(){
            return Array.from(this.shadowRoot.querySelectorAll('*')).filter(el => el.tagName.toLowerCase().startsWith('vpu-knowledge-base-organization-select'));
        });

        const organizationSelectPlaceholder = organizationSelect.shadow$('.select2-selection__placeholder');

        organizationSelectPlaceholder.waitForExist(30000, true, 'Organizations are still loading');

        //Loading table
        const spinner = orderListTab.$(function(){
            return Array.from(this.shadowRoot.querySelectorAll('*')).filter(el => el.tagName.toLowerCase().startsWith('vpu-mini-spinner'));
        });

        browser.waitUntil(function(){
            return spinner.getCSSProperty('display').value === 'none';
        }, 60000, 'The loading spinner is still visible');

        const dataTableView = orderListTab.$(function(){
            return Array.from(this.shadowRoot.querySelectorAll('*')).filter(el => el.tagName.toLowerCase().startsWith('vpu-data-table-view'));
        });

        const orderNumber = 'XXXXXXXXX'

        //Filter by order number 
        const orderNumberSearchField = dataTableView.shadow$('#input-col-5');

        orderNumberSearchField.setValue(orderNumber);
            
        //Validate
        const errorMsg = dataTableView.shadow$('tbody').$('td').getText();

        assert.strictEqual(errorMsg,'Keine Einträge vorhanden');
    });
});