import { createSqliteDatabase } from './sqliteDriver.js'
import { isSupabaseConfigured, supabase } from '../lib/supabaseClient.js'

const STATE_KEY = 'financeState-v1'
const LAYOUT_KEY = 'layoutState-v1'
const COVER_KEY = 'coverImage-v1'
const LEGACY_STORAGE_KEY = 'financeState-v1'
const APP_ID = 'finance-dashboard'
const VERSION = 1

const IDB_NAME = 'finance-dashboard'
const IDB_STORE = 'keyval'
const DB_BYTES_KEY = 'finance-sqlite-db'
const BACKUP_BYTES_KEY = 'finance-sqlite-backup'
const CLOUD_STATE_TABLE = 'user_finance_state'
const CLOUD_LAYOUT_TABLE = 'user_layout_state'
const CLOUD_COVER_TABLE = 'user_cover_image'

let dbPromise = null
export function createPersistenceAdapter() {
  const adapter = {
    loadState: async () => {
      const userId = await getCurrentUserId()
      if (userId) {
        const cloudState = await loadCloudValue({
          table: CLOUD_STATE_TABLE,
          column: 'state',
          userId,
        })
        if (cloudState) {
          return cloudState
        }
      }

      const db = await getDatabase()
      const raw = readStateRow(db)
      if (!raw) return null
      const parsed = safeParse(raw)
      if (userId && parsed) {
        await saveCloudValue({
          table: CLOUD_STATE_TABLE,
          column: 'state',
          userId,
          value: parsed,
        })
      }
      return parsed ?? null
    },
    saveState: async (state) => {
      if (typeof state === 'undefined') return

      const userId = await getCurrentUserId()
      if (userId) {
        await saveCloudValue({
          table: CLOUD_STATE_TABLE,
          column: 'state',
          userId,
          value: state,
        })
      }

      const db = await getDatabase()
      const json = JSON.stringify(state)
      writeStateRow(db, json)
      await persistDatabase(db)
    },
    exportData: async () => {
      const state = await adapter.loadState()
      return buildEnvelope(state)
    },
    importData: async (input) => {
      const payload = parseImportInput(input)
      if (!payload || typeof payload.version !== 'number' || !('state' in payload)) {
        throw new Error('Invalid import payload')
      }
      await adapter.backup()
      await adapter.saveState(payload.state)
    },
    backup: async () => {
      const state = await adapter.loadState()
      const json = JSON.stringify(state ?? null)
      await saveBackup(json)
    },
  }

  return adapter
}

export const persistenceAdapter = createPersistenceAdapter()

async function getDatabase() {
  if (!dbPromise) {
    dbPromise = initDatabase()
  }
  return dbPromise
}

async function initDatabase() {
  const bytes = await loadDB()
  const db = await createSqliteDatabase(bytes)
  db.run(
    'CREATE TABLE IF NOT EXISTS app_state (id TEXT PRIMARY KEY, json TEXT NOT NULL, updated_at TEXT NOT NULL)'
  )
  await migrateLegacyLocalStorage(db)
  return db
}

function readStateRow(db) {
  return readRow(db, STATE_KEY)
}

function readRow(db, id) {
  // Validate input to prevent SQL injection
  if (!id || typeof id !== 'string' || id.length > 255) {
    throw new Error('Invalid ID parameter')
  }
  
  // Only allow alphanumeric characters, hyphens, and underscores
  if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
    throw new Error('Invalid ID format')
  }
  
  const stmt = db.prepare('SELECT json FROM app_state WHERE id = ?')
  stmt.bind([id])
  let value = null
  if (stmt.step()) {
    const row = stmt.getAsObject()
    value = row.json || null
  }
  stmt.free()
  return value
}

function writeStateRow(db, json) {
  writeRow(db, STATE_KEY, json)
}

function writeRow(db, id, json) {
  // Validate inputs to prevent SQL injection
  if (!id || typeof id !== 'string' || id.length > 255) {
    throw new Error('Invalid ID parameter')
  }
  
  // Only allow alphanumeric characters, hyphens, and underscores
  if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
    throw new Error('Invalid ID format')
  }
  
  if (typeof json !== 'string') {
    throw new Error('Invalid JSON parameter')
  }
  
  // Limit JSON size to prevent storage attacks
  if (json.length > 10 * 1024 * 1024) { // 10MB limit
    throw new Error('JSON data too large')
  }
  
  const stmt = db.prepare(
    'INSERT OR REPLACE INTO app_state (id, json, updated_at) VALUES (?, ?, ?)'
  )
  stmt.bind([id, json, new Date().toISOString()])
  stmt.step()
  stmt.free()
}

async function persistDatabase(db) {
  const bytes = db.export()
  await saveDB(bytes)
}

async function migrateLegacyLocalStorage(db) {
  if (!hasLocalStorage()) return
  
  // Validate STATE_KEY before using
  if (!STATE_KEY || typeof STATE_KEY !== 'string') {
    throw new Error('Invalid STATE_KEY')
  }
  
  const existing = readRow(db, STATE_KEY)
  if (existing) return
  
  const legacy = window.localStorage.getItem(LEGACY_STORAGE_KEY)
  if (!legacy) return
  
  // Validate legacy data size
  if (legacy.length > 10 * 1024 * 1024) { // 10MB limit
    window.localStorage.removeItem(LEGACY_STORAGE_KEY)
    return
  }
  
  const parsed = safeParse(legacy)
  if (!parsed) {
    window.localStorage.removeItem(LEGACY_STORAGE_KEY)
    return
  }
  
  try {
    writeStateRow(db, JSON.stringify(parsed))
    await persistDatabase(db)
    window.localStorage.removeItem(LEGACY_STORAGE_KEY)
  } catch (error) {
    console.error('Failed to migrate legacy data:', error)
    // Clean up legacy data even if migration fails
    window.localStorage.removeItem(LEGACY_STORAGE_KEY)
  }
}

export async function loadLayoutState() {
  const userId = await getCurrentUserId()
  if (userId) {
    const cloudLayout = await loadCloudValue({
      table: CLOUD_LAYOUT_TABLE,
      column: 'layout',
      userId,
    })
    if (cloudLayout) {
      return cloudLayout
    }
  }

  const db = await getDatabase()
  const raw = readRow(db, LAYOUT_KEY)
  if (!raw) return null
  const parsed = safeParse(raw)
  if (userId && parsed) {
    await saveCloudValue({
      table: CLOUD_LAYOUT_TABLE,
      column: 'layout',
      userId,
      value: parsed,
    })
  }
  return parsed ?? null
}

export async function saveLayoutState(layout) {
  if (typeof layout === 'undefined') return

  const userId = await getCurrentUserId()
  if (userId) {
    await saveCloudValue({
      table: CLOUD_LAYOUT_TABLE,
      column: 'layout',
      userId,
      value: layout,
    })
  }

  const db = await getDatabase()
  writeRow(db, LAYOUT_KEY, JSON.stringify(layout))
  await persistDatabase(db)
}

export async function loadCoverImage() {
  const userId = await getCurrentUserId()
  if (userId) {
    const cloudCover = await loadCloudValue({
      table: CLOUD_COVER_TABLE,
      column: 'image',
      userId,
    })
    if (cloudCover) return cloudCover
  }

  const db = await getDatabase()
  const raw = readRow(db, COVER_KEY)
  if (!raw) return null
  const parsed = safeParse(raw)
  if (userId && parsed) {
    await saveCloudValue({
      table: CLOUD_COVER_TABLE,
      column: 'image',
      userId,
      value: parsed,
    })
  }
  return parsed
}

export async function saveCoverImage(value) {
  const userId = await getCurrentUserId()
  if (userId) {
    await saveCloudValue({
      table: CLOUD_COVER_TABLE,
      column: 'image',
      userId,
      value: value ?? null,
    })
  }

  const db = await getDatabase()
  writeRow(db, COVER_KEY, JSON.stringify(value ?? null))
  await persistDatabase(db)
}

function buildEnvelope(state) {
  return {
    version: VERSION,
    createdAt: new Date().toISOString(),
    app: APP_ID,
    state,
  }
}

function parseImportInput(input) {
  if (!input) return null
  if (typeof input === 'string') {
    return safeParse(input)
  }
  if (typeof input === 'object') {
    return input
  }
  return null
}

function safeParse(value) {
  try {
    return JSON.parse(value)
  } catch (error) {
    return null
  }
}

function hasLocalStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function hasIndexedDB() {
  return typeof indexedDB !== 'undefined'
}

async function openIdb() {
  if (!hasIndexedDB()) return null
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(IDB_NAME, 1)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE)
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function idbGet(key) {
  const db = await openIdb()
  if (!db) return null
  return new Promise((resolve) => {
    const transaction = db.transaction(IDB_STORE, 'readonly')
    const store = transaction.objectStore(IDB_STORE)
    const request = store.get(key)
    request.onsuccess = () => resolve(request.result ?? null)
    request.onerror = () => resolve(null)
  })
}

async function idbSet(key, value) {
  const db = await openIdb()
  if (!db) return
  return new Promise((resolve) => {
    const transaction = db.transaction(IDB_STORE, 'readwrite')
    const store = transaction.objectStore(IDB_STORE)
    const request = store.put(value, key)
    request.onsuccess = () => resolve()
    request.onerror = () => resolve()
  })
}

async function idbDelete(key) {
  const db = await openIdb()
  if (!db) return
  return new Promise((resolve) => {
    const transaction = db.transaction(IDB_STORE, 'readwrite')
    const store = transaction.objectStore(IDB_STORE)
    const request = store.delete(key)
    request.onsuccess = () => resolve()
    request.onerror = () => resolve()
  })
}

async function saveDB(bytes) {
  if (!bytes) return
  await idbSet(DB_BYTES_KEY, bytes)
}

async function loadDB() {
  const stored = await idbGet(DB_BYTES_KEY)
  if (!stored) return null
  if (stored instanceof Uint8Array) return stored
  if (stored instanceof ArrayBuffer) return new Uint8Array(stored)
  if (Array.isArray(stored)) return new Uint8Array(stored)
  return null
}

async function clearDB() {
  await idbDelete(DB_BYTES_KEY)
}

async function saveBackup(value) {
  await idbSet(BACKUP_BYTES_KEY, value)
}

async function getCurrentUserId() {
  if (!isSupabaseConfigured || !supabase) return null
  try {
    const { data, error } = await supabase.auth.getSession()
    if (error) return null
    return data.session?.user?.id ?? null
  } catch (error) {
    return null
  }
}

async function loadCloudValue({ table, column, userId }) {
  if (!supabase) return null
  try {
    const { data, error } = await supabase
      .from(table)
      .select(column)
      .eq('user_id', userId)
      .maybeSingle()
    if (error || !data) return null
    return data[column] ?? null
  } catch (error) {
    return null
  }
}

async function saveCloudValue({ table, column, userId, value }) {
  if (!supabase) return
  try {
    await supabase.from(table).upsert({
      user_id: userId,
      [column]: value,
      updated_at: new Date().toISOString(),
    })
  } catch (error) {
    // Fall back to local-only persistence when cloud write fails.
  }
}
