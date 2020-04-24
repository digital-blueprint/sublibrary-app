import assert from 'assert';
import VPUAppPage from '../../pageObjects/vpu-app.page';
import KeycloakAuthPage from '../../../vendor/e2e-test/pageObjects/keycloak-auth.page';

describe('shelving', () => {

    const bookName = 'Stadtatlas München Karten und Modelle von 1570 bis heute';

	it('should show all book loans and search for barcode +F3908440X at institute #F1450', () => {
        
        //LOGIN

		VPUAppPage.open();

        VPUAppPage.vpuAuthComponent.clickLoginButton();

        KeycloakAuthPage.login(browser.config.username, browser.config.password);
        
        VPUAppPage.vpuApp.waitForExist();

        //LOGIN END

        const loanListTabLink = VPUAppPage.vpuApp.shadow$('[href="/dist/de/loan-list"]');

        loanListTabLink.click(true);

        const loanListTab = VPUAppPage.vpuApp.shadow$('vpu-library-loan-list');

        loanListTab.waitForExist();

        const dataTableView = loanListTab.shadow$('#loan-loans-1');

        dataTableView.waitForExist();

        browser.pause(5000);

        //Search for barcode
        const searchField = dataTableView.shadow$('[type="search"]');

        searchField.waitForExist();

        searchField.setValue('F3908440X');

        //Validate
        const book = dataTableView.shadow$('td');

        assert.strictEqual(book.getText(), bookName);
    });
});