/**
 * Country Code Mapping Utility
 * Maps student data country codes to OECS member states
 */

// Country code mapping (from student data codes to member state codes)
export const COUNTRY_CODE_MAP = {
  'ANB': { memberStateId: 1, code: 'ANB', name: 'Antigua and Barbuda' },
  'ANG': { memberStateId: 1, code: 'ANB', name: 'Antigua and Barbuda' }, // Alternative code
  'BVI': { memberStateId: 2, code: 'BVI', name: 'British Virgin Islands' },
  'DOM': { memberStateId: 3, code: 'DMA', name: 'Dominica' },
  'DMA': { memberStateId: 3, code: 'DMA', name: 'Dominica' },
  'GRN': { memberStateId: 4, code: 'GRN', name: 'Grenada' },
  'MSR': { memberStateId: 5, code: 'MSR', name: 'Montserrat' },
  'SKN': { memberStateId: 6, code: 'SKN', name: 'Saint Kitts and Nevis' },
  'SLU': { memberStateId: 7, code: 'LCA', name: 'Saint Lucia' },
  'LCA': { memberStateId: 7, code: 'LCA', name: 'Saint Lucia' },
  'SVG': { memberStateId: 8, code: 'VCT', name: 'Saint Vincent and the Grenadines' },
  'VCT': { memberStateId: 8, code: 'VCT', name: 'Saint Vincent and the Grenadines' },
};

/**
 * Get member state info from student country code
 * @param {string} studentCountryCode - Country code from student data
 * @returns {object|null} - Member state info or null if not found
 */
export function getMemberStateFromCode(studentCountryCode) {
  if (!studentCountryCode) return null;
  return COUNTRY_CODE_MAP[studentCountryCode.toUpperCase()] || null;
}

/**
 * Check if a country code is valid
 * @param {string} countryCode - Country code to check
 * @returns {boolean}
 */
export function isValidCountryCode(countryCode) {
  if (!countryCode) return false;
  return COUNTRY_CODE_MAP.hasOwnProperty(countryCode.toUpperCase());
}

/**
 * Get all unique member states from a list of student country codes
 * @param {Array<string>} countryCodes - Array of country codes from student data
 * @returns {Array<object>} - Array of unique member state objects
 */
export function getUniqueMemberStates(countryCodes) {
  const memberStateMap = new Map();

  for (const code of countryCodes) {
    const mapping = getMemberStateFromCode(code);
    if (mapping) {
      // Use memberStateId as key to avoid duplicates (e.g., ANB and ANG)
      memberStateMap.set(mapping.memberStateId, mapping);
    }
  }

  return Array.from(memberStateMap.values());
}
