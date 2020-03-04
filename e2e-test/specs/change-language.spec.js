import assert from 'assert';
import VPUAppPage from '../pageObjects/vpu-app.page';

describe('language selector', () => {
	
	it('should change the language', () => {
		
		VPUAppPage.open();
		
		VPUAppPage.languageSelectComponent.changeLanguage();
		
        assert.strictEqual(VPUAppPage.languageSelectComponent.language, 'DE');
    });
});
