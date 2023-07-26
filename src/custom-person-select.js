import {PersonSelect} from "@dbp-toolkit/person-select";
import {ScopedElementsMixin} from '@open-wc/scoped-elements';

export class CustomPersonSelect extends ScopedElementsMixin(PersonSelect) {

    // Search for persons by name requesting local data attribute 'email'
    buildUrlData(select, params) {
        let term = params.term.trim();
        let data = {};
        data['includeLocal'] = 'email';
        data['search'] = term;

        return data;
    }

    // Includes the persons 'email' attribute if available
    formatPerson(select, person) {
        let text = person['givenName'] ?? '';
        if (person['familyName']) {
            text += ` ${person['familyName']}`;
        }

        let email = person.localData.email;
        if (email !== null && email.length) {
             text += ` (${email})`;
        }

        return text;
    }
}