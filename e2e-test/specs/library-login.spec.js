import assert from 'assert';
import VPUAppPage from '../pageObjects/vpu-app.page';
import KeycloakAuthPage from '../../vendor/e2e-test/pageObjects/keycloak-auth.page';

describe('authentication', () => {
	
	it('should do a login of the user', () => {
		
		VPUAppPage.open();
        
        VPUAppPage.vpuAuthComponent.clickLoginButton();

        KeycloakAuthPage.login(browser.config.username, browser.config.password);
		
        assert.notStrictEqual(VPUAppPage.vpuAuthComponent.name, '');
    });
});