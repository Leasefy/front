import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  isStorageAvailable,
  getStorageItem,
  setStorageItem,
  removeStorageItem,
  clearStorage,
  createStorageKey,
  StorageManager,
} from '@/lib/utils/storage';

// =============================================================================
// Provide a working in-memory localStorage mock
// happy-dom's built-in localStorage may not fully support setItem/getItem.
// =============================================================================

function createLocalStorageMock() {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string): string | null => {
      return key in store ? store[key] : null;
    },
    setItem: (key: string, value: string): void => {
      store[key] = String(value);
    },
    removeItem: (key: string): void => {
      delete store[key];
    },
    clear: (): void => {
      store = {};
    },
    get length(): number {
      return Object.keys(store).length;
    },
    key: (index: number): string | null => {
      const keys = Object.keys(store);
      return keys[index] ?? null;
    },
  };
}

let mockLocalStorage: ReturnType<typeof createLocalStorageMock>;

beforeEach(() => {
  mockLocalStorage = createLocalStorageMock();
  vi.stubGlobal('localStorage', mockLocalStorage);
});

// =============================================================================
// isStorageAvailable
// =============================================================================

describe('isStorageAvailable', () => {
  it('returns true when localStorage is available', () => {
    expect(isStorageAvailable()).toBe(true);
  });

  it('returns false when localStorage throws on setItem', () => {
    vi.stubGlobal('localStorage', {
      setItem: () => {
        throw new Error('quota exceeded');
      },
      removeItem: () => {},
    });
    expect(isStorageAvailable()).toBe(false);
  });
});

// =============================================================================
// createStorageKey
// =============================================================================

describe('createStorageKey', () => {
  it('returns a key with the arriendo-facil prefix', () => {
    const key = createStorageKey('auth', 'token');
    expect(key).toBe('arriendo-facil-auth-token');
  });

  it('handles different namespace and key combinations', () => {
    expect(createStorageKey('theme', 'mode')).toBe('arriendo-facil-theme-mode');
    expect(createStorageKey('user', 'preferences')).toBe('arriendo-facil-user-preferences');
  });

  it('handles empty strings', () => {
    expect(createStorageKey('', '')).toBe('arriendo-facil--');
  });
});

// =============================================================================
// setStorageItem / getStorageItem round-trip
// =============================================================================

describe('setStorageItem and getStorageItem', () => {
  it('round-trips a string value', () => {
    const success = setStorageItem('test-string', 'hello');
    expect(success).toBe(true);

    const value = getStorageItem<string>('test-string');
    expect(value).toBe('hello');
  });

  it('round-trips a number value', () => {
    setStorageItem('test-number', 42);
    expect(getStorageItem<number>('test-number')).toBe(42);
  });

  it('round-trips a boolean value', () => {
    setStorageItem('test-bool', true);
    expect(getStorageItem<boolean>('test-bool')).toBe(true);
  });

  it('round-trips an object value', () => {
    const obj = { name: 'test', count: 5, nested: { a: 1 } };
    setStorageItem('test-object', obj);
    expect(getStorageItem<typeof obj>('test-object')).toEqual(obj);
  });

  it('round-trips an array value', () => {
    const arr = [1, 'two', { three: 3 }];
    setStorageItem('test-array', arr);
    expect(getStorageItem('test-array')).toEqual(arr);
  });

  it('round-trips null as a value', () => {
    setStorageItem('test-null', null);
    expect(getStorageItem('test-null')).toBeNull();
  });
});

// =============================================================================
// getStorageItem
// =============================================================================

describe('getStorageItem', () => {
  it('returns null for a missing key', () => {
    expect(getStorageItem('nonexistent-key')).toBeNull();
  });

  it('stores JSON serialized data in localStorage', () => {
    setStorageItem('json-test', { foo: 'bar' });
    const raw = mockLocalStorage.getItem('json-test');
    expect(raw).toBe(JSON.stringify({ foo: 'bar' }));
  });

  it('returns null when stored value is invalid JSON', () => {
    mockLocalStorage.setItem('bad-json', '{invalid json}');
    const result = getStorageItem('bad-json', { suppressErrors: true });
    expect(result).toBeNull();
  });
});

// =============================================================================
// setStorageItem
// =============================================================================

describe('setStorageItem', () => {
  it('returns true on successful write', () => {
    expect(setStorageItem('write-test', 'value')).toBe(true);
  });

  it('stores the value as JSON in localStorage', () => {
    setStorageItem('store-check', 123);
    expect(mockLocalStorage.getItem('store-check')).toBe('123');
  });

  it('overwrites existing values', () => {
    setStorageItem('overwrite', 'first');
    setStorageItem('overwrite', 'second');
    expect(getStorageItem<string>('overwrite')).toBe('second');
  });
});

// =============================================================================
// removeStorageItem
// =============================================================================

describe('removeStorageItem', () => {
  it('removes an existing key', () => {
    setStorageItem('to-remove', 'value');
    expect(getStorageItem('to-remove')).toBe('value');

    const success = removeStorageItem('to-remove');
    expect(success).toBe(true);
    expect(getStorageItem('to-remove')).toBeNull();
  });

  it('returns true even if the key does not exist', () => {
    expect(removeStorageItem('nonexistent')).toBe(true);
  });

  it('does not affect other keys', () => {
    setStorageItem('keep', 'A');
    setStorageItem('delete', 'B');

    removeStorageItem('delete');

    expect(getStorageItem<string>('keep')).toBe('A');
    expect(getStorageItem('delete')).toBeNull();
  });
});

// =============================================================================
// clearStorage
// =============================================================================

describe('clearStorage', () => {
  it('removes all items from localStorage', () => {
    setStorageItem('key1', 'val1');
    setStorageItem('key2', 'val2');
    setStorageItem('key3', 'val3');

    const success = clearStorage();
    expect(success).toBe(true);

    expect(getStorageItem('key1')).toBeNull();
    expect(getStorageItem('key2')).toBeNull();
    expect(getStorageItem('key3')).toBeNull();
  });

  it('returns true when localStorage is already empty', () => {
    expect(clearStorage()).toBe(true);
  });

  it('localStorage.length is 0 after clearing', () => {
    setStorageItem('a', 1);
    setStorageItem('b', 2);

    clearStorage();
    expect(mockLocalStorage.length).toBe(0);
  });
});

// =============================================================================
// StorageManager
// =============================================================================

describe('StorageManager', () => {
  it('constructs without errors', () => {
    const manager = new StorageManager<string>('sm-key');
    expect(manager).toBeDefined();
  });

  it('get returns null when no value has been set', () => {
    const manager = new StorageManager<string>('sm-empty');
    expect(manager.get()).toBeNull();
  });

  it('set stores a value and get retrieves it', () => {
    const manager = new StorageManager<{ name: string }>('sm-obj');

    const success = manager.set({ name: 'test' });
    expect(success).toBe(true);

    const value = manager.get();
    expect(value).toEqual({ name: 'test' });
  });

  it('remove deletes the stored value', () => {
    const manager = new StorageManager<number>('sm-remove');
    manager.set(99);
    expect(manager.get()).toBe(99);

    const success = manager.remove();
    expect(success).toBe(true);
    expect(manager.get()).toBeNull();
  });

  it('set overwrites previous values', () => {
    const manager = new StorageManager<string>('sm-overwrite');
    manager.set('first');
    manager.set('second');
    expect(manager.get()).toBe('second');
  });

  it('multiple managers with different keys are independent', () => {
    const managerA = new StorageManager<string>('sm-a');
    const managerB = new StorageManager<string>('sm-b');

    managerA.set('alpha');
    managerB.set('beta');

    expect(managerA.get()).toBe('alpha');
    expect(managerB.get()).toBe('beta');

    managerA.remove();
    expect(managerA.get()).toBeNull();
    expect(managerB.get()).toBe('beta');
  });

  it('works with complex generic types', () => {
    interface UserPrefs {
      theme: 'light' | 'dark';
      fontSize: number;
      tags: string[];
    }

    const manager = new StorageManager<UserPrefs>('sm-prefs');
    const prefs: UserPrefs = { theme: 'dark', fontSize: 14, tags: ['a', 'b'] };

    manager.set(prefs);
    expect(manager.get()).toEqual(prefs);
  });
});
