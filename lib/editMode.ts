/**
 * Edit Mode Management
 * Stores edit mode flag in sessionStorage for clean URLs
 */

const EDIT_MODE_KEY = "__pems_edit_mode";
const MODE_TIMEOUT = 5000; // 5 seconds

/**
 * Set edit mode flag in sessionStorage
 * This allows clean URLs while tracking edit mode internally
 */
export function setEditMode(enabled: boolean): void {
  if (typeof window === "undefined") return;
  
  try {
    if (enabled) {
      sessionStorage.setItem(EDIT_MODE_KEY, "true");
      
      // Auto-expire the flag after timeout
      setTimeout(() => {
        try {
          sessionStorage.removeItem(EDIT_MODE_KEY);
        } catch {
          // Ignore
        }
      }, MODE_TIMEOUT);
    } else {
      sessionStorage.removeItem(EDIT_MODE_KEY);
    }
  } catch {
    // Ignore storage errors
  }
}

/**
 * Check if edit mode is enabled
 * Returns true if we should allow editing
 * Note: Does NOT clear the flag - it expires naturally after MODE_TIMEOUT
 */
export function isEditModeEnabled(): boolean {
  if (typeof window === "undefined") return false;
  
  try {
    const enabled = sessionStorage.getItem(EDIT_MODE_KEY) === "true";
    return enabled;
  } catch {
    return false;
  }
}
