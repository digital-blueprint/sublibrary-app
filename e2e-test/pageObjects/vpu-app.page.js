import Page from '../../vendor/e2e-test/pageObjects/page';
import LanguageSelect from '../../vendor/e2e-test/components/language-select.component';
import VPUAuth from '../../vendor/e2e-test/components/vpu-auth.component';

class VPUAppPage extends Page {

    open() {
        super.open('');
	}
	
	get vpuApp() {
		return browser.$('vpu-app-library');
	}
	
	get languageSelectComponent() {
		return new LanguageSelect(this.vpuApp.shadow$('vpu-language-select'));
	}

	get vpuAuthComponent() {
		return new VPUAuth(this.vpuApp.shadow$('[show-profile]'));
	}

}

export default new VPUAppPage();