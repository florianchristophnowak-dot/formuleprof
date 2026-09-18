/**
 * Speicherabstraktion. Die App spricht ausschliesslich über diese Schnittstelle
 * mit der Persistenz – dadurch bleiben Fachlogik und Tests unabhängig von
 * IndexedDB.
 */

export const STORE_NAMES = [
  'meta',
  'templates',
  'milestones',
  'goals',
  'reflections',
  'unterrichtswochen',
  'ausbildungsstunden',
  'unterlagen',
  'kontakte',
] as const;
export type StoreName = (typeof STORE_NAMES)[number];

export interface StorageAdapter {
  get<T>(store: StoreName, key: string): Promise<T | undefined>;
  getAll<T>(store: StoreName): Promise<T[]>;
  put<T>(store: StoreName, key: string, value: T): Promise<void>;
  putMany<T>(store: StoreName, entries: [string, T][]): Promise<void>;
  remove(store: StoreName, key: string): Promise<void>;
  replaceAll<T>(store: StoreName, entries: [string, T][]): Promise<void>;
  clear(store: StoreName): Promise<void>;
  clearAll(): Promise<void>;
}

/** In-Memory-Speicher – für Tests und als Rückfallebene ohne IndexedDB. */
export class MemoryStorageAdapter implements StorageAdapter {
  private data = new Map<StoreName, Map<string, unknown>>();

  constructor() {
    for (const name of STORE_NAMES) this.data.set(name, new Map());
  }

  private store(name: StoreName): Map<string, unknown> {
    const store = this.data.get(name);
    if (!store) throw new Error(`Unbekannter Speicherbereich: ${name}`);
    return store;
  }

  async get<T>(store: StoreName, key: string): Promise<T | undefined> {
    return structuredClone(this.store(store).get(key)) as T | undefined;
  }

  async getAll<T>(store: StoreName): Promise<T[]> {
    return structuredClone([...this.store(store).values()]) as T[];
  }

  async put<T>(store: StoreName, key: string, value: T): Promise<void> {
    this.store(store).set(key, structuredClone(value));
  }

  async putMany<T>(store: StoreName, entries: [string, T][]): Promise<void> {
    for (const [key, value] of entries) await this.put(store, key, value);
  }

  async remove(store: StoreName, key: string): Promise<void> {
    this.store(store).delete(key);
  }

  async replaceAll<T>(store: StoreName, entries: [string, T][]): Promise<void> {
    this.store(store).clear();
    await this.putMany(store, entries);
  }

  async clear(store: StoreName): Promise<void> {
    this.store(store).clear();
  }

  async clearAll(): Promise<void> {
    for (const name of STORE_NAMES) this.store(name).clear();
  }
}

const DB_NAME = 'formuleprof';
/**
 * Version 2 ergänzt die Bereiche des Wegweisers. Fehlende Bereiche werden
 * beim Öffnen angelegt; vorhandene Daten bleiben unverändert.
 */
const DB_VERSION = 2;

/** Dauerhafte lokale Speicherung in IndexedDB – ohne externe Abhängigkeit. */
export class IndexedDbStorageAdapter implements StorageAdapter {
  private dbPromise: Promise<IDBDatabase> | null = null;

  private open(): Promise<IDBDatabase> {
    if (!this.dbPromise) {
      this.dbPromise = new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = () => {
          const db = request.result;
          for (const name of STORE_NAMES) {
            if (!db.objectStoreNames.contains(name)) db.createObjectStore(name);
          }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error ?? new Error('IndexedDB konnte nicht geöffnet werden.'));
        request.onblocked = () => reject(new Error('Die lokale Datenbank wird von einem anderen Tab blockiert.'));
      });
    }
    return this.dbPromise;
  }

  private async run<T>(
    store: StoreName,
    mode: IDBTransactionMode,
    action: (objectStore: IDBObjectStore) => IDBRequest | IDBRequest[] | null,
  ): Promise<T> {
    const db = await this.open();
    return new Promise<T>((resolve, reject) => {
      const transaction = db.transaction(store, mode);
      const objectStore = transaction.objectStore(store);
      let result: unknown;
      const request = action(objectStore);
      if (request && !Array.isArray(request)) {
        request.onsuccess = () => {
          result = request.result;
        };
      }
      transaction.oncomplete = () => resolve(result as T);
      transaction.onerror = () => reject(transaction.error ?? new Error('Speicherzugriff fehlgeschlagen.'));
      transaction.onabort = () => reject(transaction.error ?? new Error('Speicherzugriff abgebrochen.'));
    });
  }

  get<T>(store: StoreName, key: string): Promise<T | undefined> {
    return this.run<T | undefined>(store, 'readonly', (objectStore) => objectStore.get(key));
  }

  async getAll<T>(store: StoreName): Promise<T[]> {
    const result = await this.run<T[] | undefined>(store, 'readonly', (objectStore) => objectStore.getAll());
    return result ?? [];
  }

  put<T>(store: StoreName, key: string, value: T): Promise<void> {
    return this.run<void>(store, 'readwrite', (objectStore) => objectStore.put(value, key));
  }

  putMany<T>(store: StoreName, entries: [string, T][]): Promise<void> {
    return this.run<void>(store, 'readwrite', (objectStore) => {
      for (const [key, value] of entries) objectStore.put(value, key);
      return null;
    });
  }

  remove(store: StoreName, key: string): Promise<void> {
    return this.run<void>(store, 'readwrite', (objectStore) => objectStore.delete(key));
  }

  replaceAll<T>(store: StoreName, entries: [string, T][]): Promise<void> {
    return this.run<void>(store, 'readwrite', (objectStore) => {
      objectStore.clear();
      for (const [key, value] of entries) objectStore.put(value, key);
      return null;
    });
  }

  clear(store: StoreName): Promise<void> {
    return this.run<void>(store, 'readwrite', (objectStore) => objectStore.clear());
  }

  async clearAll(): Promise<void> {
    for (const name of STORE_NAMES) await this.clear(name);
  }
}

/** Liefert den passenden Speicher für die aktuelle Umgebung. */
export function createStorageAdapter(): StorageAdapter {
  if (typeof indexedDB !== 'undefined') {
    try {
      return new IndexedDbStorageAdapter();
    } catch {
      // Fällt auf den flüchtigen Speicher zurück, z. B. in strengen Datenschutzmodi.
    }
  }
  return new MemoryStorageAdapter();
}
