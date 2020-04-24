import assert from 'assert';
import VPUAppPage from '../../pageObjects/vpu-app.page';
import KeycloakAuthPage from '../../../vendor/e2e-test/pageObjects/keycloak-auth.page';

describe('shelving', () => {
    
    const bookName = '1922, Ausblick auf eine Architektur';

	it('should open the second page of the book list and get the first book name at institute #F1450', () => {
        
        //LOGIN

		VPUAppPage.open();

        VPUAppPage.vpuAuthComponent.clickLoginButton();

        KeycloakAuthPage.login(browser.config.username, browser.config.password);
        
        VPUAppPage.vpuApp.waitForExist();

        //LOGIN END

        const bookListTabLink = VPUAppPage.vpuApp.shadow$('[href="/dist/de/book-list"]');

        bookListTabLink.click(true);

        const bookListTab = VPUAppPage.vpuApp.shadow$('vpu-library-book-list');

        bookListTab.waitForExist();

        const dataTableView = bookListTab.shadow$('#book-books-1');

        dataTableView.waitForExist();

        browser.pause(40000);

        const page2Link = dataTableView.shadow$('[data-dt-idx="2"]');

        page2Link.click(true);

        const firstBook = dataTableView.shadow$('td');

        assert.strictEqual(firstBook.getText(), bookName);
    });
});