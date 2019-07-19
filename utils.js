const vars = require("./vars");

module.exports = {
    getAssetURL: (path) => {
        const elm = document.getElementById('vpu-library-shelving-wc-src');
        if (!elm)
            return path;
        const url = elm.src;
        // newer browsers only
        //var url = import.meta.url;
        return new URL(path, url).href;
    },

    getAPiUrl: function(path = "", withPrefix = true) {
        return vars.apiBaseUrl + (withPrefix ? vars.apiUrlPrefix : "") + path;
    },

    /**
     * Finds an object in a JSON result by identifier
     *
     * @param identifier
     * @param results
     * @param identifierAttribute
     */
    findObjectInApiResults: (identifier, results, identifierAttribute = "@id") => {
        const members = results["hydra:member"];

        for (const object of members){
            if (object[identifierAttribute] === identifier) {
                return object;
            }
        }
    },

    /**
     * Converts a string list to a data array for Select2
     *
     * @param list
     * @returns {Array}
     */
    stringListToSelect2DataArray: (list) => {
        let data = [];
        list.forEach((item) => {data.push({id: item, text: item})});
        return data;
    },

    /**
     * Reads a setting
     *
     * @param key
     * @returns {*}
     */
    setting: (key) => vars[key]
};
