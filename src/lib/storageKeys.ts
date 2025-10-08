/**
 * Storage keys for isolating customer and staff sessions
 * 
 * CRITICAL: These keys ensure that customer and staff authentication
 * do not interfere with each other. Never mix or share these keys.
 */

export const STORAGE_KEYS = {
  // Staff (POS) authentication
  STAFF_SESSION: 'paganos_staff_session',
  STAFF_USER: 'paganos_staff_user',
  
  // Customer (Portal) authentication
  CUSTOMER_SESSION: 'paganos_customer_session',
  CUSTOMER_USER: 'paganos_customer_user',
} as const;

/**
 * Clear all staff-related storage
 */
export const clearStaffStorage = () => {
  localStorage.removeItem(STORAGE_KEYS.STAFF_SESSION);
  localStorage.removeItem(STORAGE_KEYS.STAFF_USER);
};

/**
 * Clear all customer-related storage
 */
export const clearCustomerStorage = () => {
  localStorage.removeItem(STORAGE_KEYS.CUSTOMER_SESSION);
  localStorage.removeItem(STORAGE_KEYS.CUSTOMER_USER);
};
