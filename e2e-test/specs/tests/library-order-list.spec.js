import assert from 'assert';
import VPUAppPage from '../../pageObjects/vpu-app.page';
import KeycloakAuthPage from '../../../vendor/e2e-test/pageObjects/keycloak-auth.page';

describe('shelving', () => {
    
    const bookName = 'Büro- und Verwaltungsbauten';
    const orderNumber = '2010/629';

	it('should filter the order list after title for institute #F1450', () => {
        
        //LOGIN

		VPUAppPage.open();

        VPUAppPage.vpuAuthComponent.clickLoginButton();

        KeycloakAuthPage.login(browser.config.username, browser.config.password);
        
        VPUAppPage.vpuApp.waitForExist();

        //LOGIN END

        const orderListTabLink = VPUAppPage.vpuApp.shadow$('[href="/dist/de/order-list"]');

        orderListTabLink.click(true);

        const orderListTab = VPUAppPage.vpuApp.shadow$('vpu-library-order-list');

        orderListTab.waitForExist();

        const dataTableView = orderListTab.shadow$('#book-books-1');

        dataTableView.waitForExist();

        browser.pause(25000);

        //Filter by order number 
        const orderNumberSearchField = dataTableView.shadow$('#input-col-5');

        orderNumberSearchField.waitForExist();

        orderNumberSearchField.setValue(orderNumber);
            
        //Validate
        const bookTitle = dataTableView.shadow$('tbody').$('td');

        bookTitle.waitForExist();

        assert.strictEqual(bookTitle.getText(), bookName);
    });
});