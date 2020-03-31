import assert from 'assert';
import VPUAppPage from '../pageObjects/vpu-app.page';

describe('language selector', () => {
	
	it('should change the language', () => {
		
		VPUAppPage.open();
		
		VPUAppPage.languageSelectComponent.changeLanguage();
		
        browser.pause(5000);
        
        assert.strictEqual(VPUAppPage.languageSelectComponent.language, 'ES');
    });
});
