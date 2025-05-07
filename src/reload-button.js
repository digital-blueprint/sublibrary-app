import {ScopedElementsMixin} from '@dbp-toolkit/common';
import {LitElement} from 'lit';
import {Icon} from '@dbp-toolkit/common';
import {css, html} from 'lit';
import * as commonStyles from '@dbp-toolkit/common/styles';

export class ReloadButton extends ScopedElementsMixin(LitElement) {
    constructor() {
        super();
        this.disabled = true;
    }

    static get scopedElements() {
        return {
            'dbp-icon': Icon,
        };
    }

    static get properties() {
        return {
            ...super.properties,
            title: {type: String, attribute: 'title'},
            disabled: {type: Boolean, attribute: 'disabled'},
        };
    }

    static get styles() {
        return css`
            ${commonStyles.getThemeCSS()}
            ${commonStyles.getGeneralCSS()}
            ${commonStyles.getButtonCSS()}
        
            :host {
                display: inline-block;
            }

            #reload-button {
                padding: 3px 12px;
                height: 100%;
                display: flex;
                align-items: center;
            }

            dbp-icon {
                top: 0;
            }
        `;
    }

    render() {
        return html`
            <a
                class="control button"
                id="reload-button"
                ?disabled="${this.disabled}"
                title="${this.title}">
                <dbp-icon name="reload"></dbp-icon>
            </a>
        `;
    }
}
