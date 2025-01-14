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

export function escapeHtml(str) {
    return str.replace(/[<>&"]/g, (char) => {
        switch (char) {
          case '<':
            return '&lt;';
          case '>':
            return '&gt;';
          case '&':
            return '&amp;';
          case '"':
            return '&quot;';
          default:
            return char;
        }
      });
}

/**
 * Extracts the earliest possible year from a publication date string.
 * Some example values: "2021", "[2021]", "2021-", "1959-[2020]", "[19]71-2022", "May 2021", "©2005"
 *
 * @param {string} publicationDate - The publication date string, which may contain multiple years.
 * @returns {number|null} The earliest year found in the publication date string, or null if no valid year is found.
 */
export function extractEarliestPossibleYearFromPublicationDate(publicationDate) {
  const matches = publicationDate.replace(/[()[\]]/g, '').match(/\d+/g);
  if (!matches) {
    return null;
  }

  let earliestYear = null;
  for (const match of matches) {
    const year = Number(match);
    // Ignore anything below the year 1000, since that could reference editions and not years.
    if (year >= 1000 && (earliestYear === null || year < earliestYear)) {
      earliestYear = year;
    }
  }

  return earliestYear;
}
