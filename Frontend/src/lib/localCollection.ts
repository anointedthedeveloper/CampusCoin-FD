/**
 * Thin, typed wrapper around a localStorage-backed array of records.
 *
 * There is no backend yet, so every domain service (transactions,
 * categories, budgets, ...) persists through one of these instead of
 * touching `localStorage` directly. That keeps the storage format in one
 * place and gives each service a real CRUD surface to call — swapping a
 * service's body for real HTTP calls later doesn't require touching any
 * component, because the service's public shape doesn't change.
 *
 * Each collection is wrapped in `{ version, items }` so a future change to
 * a record's shape can be migrated in `readCollection` without losing
 * data already saved by users testing an earlier version of the app.
 */

const STORAGE_FORMAT_VERSION = 1;

interface StoredCollection<T> {
  version: number;
  items: T[];
}

function readCollection<T>(storageKey: string): T[] {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as StoredCollection<T> | T[];
    // Defensive: accept a bare array too, in case a key is ever seeded by hand.
    return Array.isArray(parsed) ? parsed : parsed.items;
  } catch {
    return [];
  }
}

function writeCollection<T>(storageKey: string, items: T[]): void {
  const payload: StoredCollection<T> = { version: STORAGE_FORMAT_VERSION, items };
  localStorage.setItem(storageKey, JSON.stringify(payload));
}

export interface LocalCollection<T extends { id: string }> {
  getAll(): T[];
  getById(id: string): T | undefined;
  query(predicate: (item: T) => boolean): T[];
  insert(item: T): T;
  update(id: string, patch: Partial<T>): T | undefined;
  remove(id: string): void;
  removeWhere(predicate: (item: T) => boolean): number;
  replaceAll(items: T[]): void;
}

export function createLocalCollection<T extends { id: string }>(storageKey: string): LocalCollection<T> {
  return {
    getAll() {
      return readCollection<T>(storageKey);
    },
    getById(id) {
      return readCollection<T>(storageKey).find((item) => item.id === id);
    },
    query(predicate) {
      return readCollection<T>(storageKey).filter(predicate);
    },
    insert(item) {
      const items = readCollection<T>(storageKey);
      items.push(item);
      writeCollection(storageKey, items);
      return item;
    },
    update(id, patch) {
      const items = readCollection<T>(storageKey);
      const index = items.findIndex((item) => item.id === id);
      if (index === -1) return undefined;
      items[index] = { ...items[index], ...patch };
      writeCollection(storageKey, items);
      return items[index];
    },
    remove(id) {
      const items = readCollection<T>(storageKey);
      writeCollection(
        storageKey,
        items.filter((item) => item.id !== id),
      );
    },
    removeWhere(predicate) {
      const items = readCollection<T>(storageKey);
      const remaining = items.filter((item) => !predicate(item));
      writeCollection(storageKey, remaining);
      return items.length - remaining.length;
    },
    replaceAll(items) {
      writeCollection(storageKey, items);
    },
  };
}

/** Short, collision-safe-enough id for a local-only prototype (no backend to assign one). */
export function generateLocalId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}
