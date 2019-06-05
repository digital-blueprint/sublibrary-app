"use strict";

module.exports = class JSONLD {
    constructor(foreignContext, localContext) {
        this.foreignContext = foreignContext;
        this.localContext = localContext;
    }

    /**
     * Expands a member of a list to a object with schema.org properties
     *
     * @param member
     */
    expandMember(member) {
        if (!this.foreignContext.hasOwnProperty("@context")) {
            return [];
        }

        let result = {"@id": member["@id"]};
        let context = this.foreignContext["@context"];

        for (const property in context) {
            if (member.hasOwnProperty(property)) {
                const value = member[property];

                if (value !== undefined && context.hasOwnProperty(property)) {
                    result[context[property]] = value;
                }
            }
        }

        return result;
    }

    /**
     * Compacts an expanded member of a list to a object with local properties
     *
     * @param member
     */
    compactMember(member) {
        let result = {};
        let context = this.localContext;

        for (const property in context) {
            const value = member[context[property]];

            if (value !== undefined) {
                result[property] = value;
            }
        }

        return result;
    }

    /**
     *
     * @param data
     * @returns {Array}
     */
    transformResult(data) {
        const members = data['hydra:member'];

        if (members === undefined || members.length === 0) {
            return [];
        }

        let results = [];
        let that = this;

        members.forEach(function (member) {
            results.push(that.compactMember(that.expandMember(member)));
        });

        return results;
    }
};
