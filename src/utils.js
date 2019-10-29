/**
 * Finds an object in a JSON result by identifier
 *
 * @param identifier
 * @param results
 * @param identifierAttribute
 */
export const findObjectInApiResults = (identifier, results, identifierAttribute = "@id") => {
    const members = results["hydra:member"];

    if (members === undefined) {
        return;
    }

    for (const object of members) {
        if (object[identifierAttribute] === identifier) {
            return object;
        }
    }
};

/**
 * Returns the list of assigned libraries of the current user
 *
 * @returns {Array}
 */
export const getCurrentLibraries = () => {
    if (window.VPUPerson === undefined) {
        return [];
    }

    const functions = window.VPUPerson.functions;

    if (functions === undefined) {
        return [];
    }

    const re = /^F_BIB:F:(\d+):\d+$/;
    let results = [];

    for (const item of functions) {
        const matches = re.exec(item);

        if (matches !== null) {
            results.push("F" + matches[1]);
        }
    }

    return results;
};
