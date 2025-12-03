/**
 * Utility functions for sorting assessment items
 *
 * Items should be sorted:
 * 1. MC (Multiple Choice) items first, then CR (Constructed Response) items
 * 2. Within each type, sorted by natural item code order (Q1, Q1a, Q1b, Q2, Q2a, etc.)
 */

/**
 * Parse item code into components for natural sorting
 * Examples:
 *   "Q1" -> { num: 1, letter: "" }
 *   "Q1a" -> { num: 1, letter: "a" }
 *   "Q12b" -> { num: 12, letter: "b" }
 */
function parseItemCode(itemCode) {
  const match = itemCode.match(/^Q?(\d+)([a-z]?)$/i);
  if (!match) {
    return { num: 0, letter: '' };
  }
  return {
    num: parseInt(match[1], 10),
    letter: match[2].toLowerCase()
  };
}

/**
 * Compare two item codes for natural sorting
 * @param {string} codeA - First item code
 * @param {string} codeB - Second item code
 * @returns {number} - Negative if A < B, positive if A > B, 0 if equal
 */
export function compareItemCodes(codeA, codeB) {
  const a = parseItemCode(codeA);
  const b = parseItemCode(codeB);

  // Compare numbers first
  if (a.num !== b.num) {
    return a.num - b.num;
  }

  // If numbers are equal, compare letters
  if (a.letter < b.letter) return -1;
  if (a.letter > b.letter) return 1;
  return 0;
}

/**
 * Sort items array with MC items first, then CR items, each in natural order
 * @param {Array} items - Array of item objects with item_code/itemCode and item_type/itemType
 * @returns {Array} - Sorted array
 */
export function sortItems(items) {
  return [...items].sort((a, b) => {
    // Extract item type (handle both item_type and itemType)
    const typeA = (a.item_type || a.itemType || 'MC').toUpperCase();
    const typeB = (b.item_type || b.itemType || 'MC').toUpperCase();

    // MC items first, then CR items
    if (typeA !== typeB) {
      return typeA === 'MC' ? -1 : 1;
    }

    // Within same type, sort by item code
    const codeA = a.item_code || a.itemCode || '';
    const codeB = b.item_code || b.itemCode || '';

    return compareItemCodes(codeA, codeB);
  });
}

/**
 * Get sort comparator function for table sorting with MC/CR grouping
 * @param {string} order - 'asc' or 'desc'
 * @param {string} orderBy - field to sort by
 * @returns {function} - Comparator function
 */
export function getItemComparator(order, orderBy) {
  return (a, b) => {
    // Always group by item type first (MC before CR)
    const typeA = (a.item_type || a.itemType || 'MC').toUpperCase();
    const typeB = (b.item_type || b.itemType || 'MC').toUpperCase();

    if (typeA !== typeB) {
      return typeA === 'MC' ? -1 : 1;
    }

    // Within same type, sort by requested field
    if (orderBy === 'item_code') {
      const codeA = a.item_code || a.itemCode || '';
      const codeB = b.item_code || b.itemCode || '';
      const result = compareItemCodes(codeA, codeB);
      return order === 'desc' ? -result : result;
    }

    // For other fields (difficulty, discrimination, etc.)
    let aVal, bVal;

    if (orderBy === 'difficulty') {
      aVal = a.statistics?.difficulty || a.difficulty || 0;
      bVal = b.statistics?.difficulty || b.difficulty || 0;
    } else if (orderBy === 'discrimination') {
      aVal = a.statistics?.discrimination || a.discrimination || 0;
      bVal = b.statistics?.discrimination || b.discrimination || 0;
    } else if (orderBy === 'point_biserial') {
      aVal = a.statistics?.point_biserial || a.point_biserial || 0;
      bVal = b.statistics?.point_biserial || b.point_biserial || 0;
    } else {
      return 0;
    }

    const result = aVal - bVal;
    return order === 'desc' ? -result : result;
  };
}
