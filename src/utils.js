/**
 * Finds an object in a JSON result by identifier
 * @param identifier
 * @param results
 * @param identifierAttribute
 */
export const findObjectInApiResults = (identifier, results, identifierAttribute = '@id') => {
    const members = results['hydra:member'];

    if (members === undefined) {
        return;
    }

    for (const object of members) {
        if (object[identifierAttribute] === identifier) {
            return object;
        }
    }
};

export function getPersonDisplayName(person) {
    return `${person.givenName} ${person.familyName}`;
}

export function getLibraryCodeFromId(id) {
    return id.includes('-') ? id.split('-')[1] : '';
}
