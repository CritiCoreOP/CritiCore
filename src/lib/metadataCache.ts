import LZString from "lz-string";

const DB_NAME = "metadata-cache-db";
const STORE_NAME = "metadata";
const DB_VERSION = 1;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

interface CacheEntry {
  compressed: string;
  timestamp: number;
}

// ---- IndexedDB helpers ----

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbGet(key: string): Promise<CacheEntry | undefined> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result as CacheEntry | undefined);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return undefined;
  }
}

async function idbSet(key: string, value: CacheEntry): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(value, key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {
    // fallback to localStorage
    lsSet(key, value);
  }
}

async function idbGetAllKeys(): Promise<string[]> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAllKeys();
      req.onsuccess = () => resolve(req.result as string[]);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return lsGetAllKeys();
  }
}

// ---- LocalStorage fallback ----
const LS_PREFIX = "mc_";

function lsSet(key: string, value: CacheEntry) {
  try {
    localStorage.setItem(LS_PREFIX + key, JSON.stringify(value));
  } catch { /* storage full */ }
}

function lsGet(key: string): CacheEntry | undefined {
  try {
    const raw = localStorage.getItem(LS_PREFIX + key);
    return raw ? JSON.parse(raw) : undefined;
  } catch {
    return undefined;
  }
}

function lsGetAllKeys(): string[] {
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k?.startsWith(LS_PREFIX)) keys.push(k.slice(LS_PREFIX.length));
  }
  return keys;
}

// ---- Public API ----

export async function getCachedEntry(key: string): Promise<CacheEntry | undefined> {
  const entry = (await idbGet(key)) ?? lsGet(key);
  if (!entry) return undefined;
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) return undefined;
  return entry;
}

export async function setCachedEntry<T>(key: string, data: T): Promise<void> {
  const compressed = LZString.compressToUTF16(JSON.stringify(data));
  const entry: CacheEntry = { compressed, timestamp: Date.now() };
  await idbSet(key, entry);
}

export function decompress<T>(entry: CacheEntry): T {
  const json = LZString.decompressFromUTF16(entry.compressed);
  return JSON.parse(json!) as T;
}

export async function getCachedKeys(): Promise<Set<string>> {
  const keys = await idbGetAllKeys();
  // Filter out expired entries
  const valid = new Set<string>();
  for (const k of keys) {
    const entry = (await idbGet(k)) ?? lsGet(k);
    if (entry && Date.now() - entry.timestamp <= CACHE_TTL_MS) {
      valid.add(k);
    }
  }
  return valid;
}
