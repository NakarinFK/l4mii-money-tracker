import wasmUrl from 'sql.js/dist/sql-wasm.wasm?url'

export async function createSqliteDatabase(bytes) {
  const initSqlJs = (await import('sql.js')).default
  const SQL = await initSqlJs({
    locateFile: () => wasmUrl,
  })

  if (bytes && bytes.length) {
    return new SQL.Database(bytes)
  }

  return new SQL.Database()
}
