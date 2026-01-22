/**
 * Centralized localStorage utilities with error handling and SSR safety
 * 
 * Provides type-safe localStorage operations with consistent error handling
 * across the application.
 */

// ============================================================================
// Types
// ============================================================================

export interface StorageOptions {
  /** Whether to suppress errors (default: false) */
  suppressErrors?: boolean;
  /** Custom error handler */
  onError?: (error: Error, operation: 'get' | 'set' | 'remove') => void;
}

// ============================================================================
// Error Handling
// ============================================================================

/**
 * Log storage errors in a consistent way
 */
function handleStorageError(
  error: unknown,
  operation: 'get' | 'set' | 'remove',
  key: string,
  options?: StorageOptions
): void {
  const errorMessage = error instanceof Error ? error.message : 'Unknown error';
  const message = `Storage ${operation} failed for key "${key}": ${errorMessage}`;

  if (options?.onError) {
    options.onError(
      error instanceof Error ? error : new Error(errorMessage),
      operation
    );
  } else if (!options?.suppressErrors) {
    // In production, you might want to send this to an error tracking service
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.error(message, error);
    }
  }
}

// ============================================================================
// Core Storage Functions
// ============================================================================

/**
 * Check if localStorage is available (SSR-safe)
 */
export function isStorageAvailable(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    const testKey = '__storage_test__';
    localStorage.setItem(testKey, testKey);
    localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get item from localStorage with type safety
 */
export function getStorageItem<T>(
  key: string,
  options?: StorageOptions
): T | null {
  if (!isStorageAvailable()) {
    return null;
  }

  try {
    const item = localStorage.getItem(key);
    if (item === null) {
      return null;
    }
    return JSON.parse(item) as T;
  } catch (error) {
    handleStorageError(error, 'get', key, options);
    return null;
  }
}

/**
 * Set item in localStorage with error handling
 */
export function setStorageItem<T>(
  key: string,
  value: T,
  options?: StorageOptions
): boolean {
  if (!isStorageAvailable()) {
    return false;
  }

  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    handleStorageError(error, 'set', key, options);
    return false;
  }
}

/**
 * Remove item from localStorage
 */
export function removeStorageItem(
  key: string,
  options?: StorageOptions
): boolean {
  if (!isStorageAvailable()) {
    return false;
  }

  try {
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    handleStorageError(error, 'remove', key, options);
    return false;
  }
}

/**
 * Clear all items from localStorage (use with caution)
 */
export function clearStorage(options?: StorageOptions): boolean {
  if (!isStorageAvailable()) {
    return false;
  }

  try {
    localStorage.clear();
    return true;
  } catch (error) {
    handleStorageError(error, 'remove', 'all', options);
    return false;
  }
}

// ============================================================================
// Hook-like Utilities for React Contexts
// ============================================================================

/**
 * Create a storage key with namespace
 */
export function createStorageKey(namespace: string, key: string): string {
  return `arriendo-facil-${namespace}-${key}`;
}

/**
 * Storage manager for a specific namespace
 */
export class StorageManager<T> {
  private key: string;

  constructor(key: string) {
    this.key = key;
  }

  get(options?: StorageOptions): T | null {
    return getStorageItem<T>(this.key, options);
  }

  set(value: T, options?: StorageOptions): boolean {
    return setStorageItem(this.key, value, options);
  }

  remove(options?: StorageOptions): boolean {
    return removeStorageItem(this.key, options);
  }
}
