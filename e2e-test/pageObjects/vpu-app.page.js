import Page from '../../e2e-test-submodule/pageObjects/page';
import LanguageSelect from '../../e2e-test-submodule/components/language-select.component';
import VPUAuth from '../../e2e-test-submodule/components/vpu-auth.component';

class VPUAppPage extends Page {

    open() {
        super.open('');
	}
	
	get vpuApp() {
		return browser.$('vpu-app');
	}
	
	get languageSelectComponent() {
		return new LanguageSelect(this.vpuApp.shadow$('vpu-language-select'));
	}

	get vpuAuthComponent() {
		return new VPUAuth(this.vpuApp.shadow$('vpu-auth'));
	}

}

export default new VPUAppPage();