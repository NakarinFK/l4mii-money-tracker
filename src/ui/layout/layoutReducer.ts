import { DEFAULT_LAYOUT } from './defaultLayout'
import type {
  LayoutAction,
  LayoutItem,
  LayoutState,
} from './layoutTypes'

export function layoutReducer(
  state: LayoutState,
  action: LayoutAction
): LayoutState {
  switch (action.type) {
    case 'MOVE_ITEM_TO_CELL': {
      const payload = action.payload
      const item = state.items.find((entry) => entry.id === payload?.id)
      if (!item || !payload) return state
      if (item.locked) return state

      const next = {
        ...item,
        x: clamp(payload.x, 0, state.grid.cols - item.w),
        y: clamp(payload.y, 0, state.grid.rows - item.h),
      }

      if (!canPlace(next, state.items, state.grid)) {
        return state
      }

      return {
        ...state,
        items: state.items.map((entry) =>
          entry.id === item.id ? next : entry
        ),
      }
    }
    case 'RESIZE_ITEM': {
      const payload = action.payload
      const item = state.items.find((entry) => entry.id === payload?.id)
      if (!item || !payload) return state
      if (item.locked) return state

      const resized: LayoutItem = {
        ...item,
        w: clamp(payload.w, 1, state.grid.cols),
        h: clamp(payload.h, 1, state.grid.rows),
      }
      resized.x = clamp(resized.x, 0, state.grid.cols - resized.w)
      resized.y = clamp(resized.y, 0, state.grid.rows - resized.h)

      if (!canPlace(resized, state.items, state.grid)) {
        return state
      }

      return {
        ...state,
        items: state.items.map((entry) =>
          entry.id === item.id ? resized : entry
        ),
      }
    }
    case 'TOGGLE_BLOCK_VISIBILITY': {
      const id = action.payload?.id
      if (!id) return state
      return {
        ...state,
        items: state.items.map((item) =>
          item.id === id ? { ...item, hidden: !isItemHidden(item) } : item
        ),
      }
    }
    case 'RESET_LAYOUT':
      return cloneLayout(DEFAULT_LAYOUT)
    case 'TOGGLE_COLLAPSE': {
      const collapseId = action.payload?.id
      if (!collapseId) return state
      return {
        ...state,
        items: state.items.map((item) =>
          item.id === collapseId
            ? { ...item, collapsed: !item.collapsed }
            : item
        ),
      }
    }
    default:
      return state
  }
}

export function normalizeLayoutState(input?: any): LayoutState {
  // already grid v2
  if (
    input &&
    input.version === 2 &&
    input.grid &&
    Array.isArray(input.items)
  ) {
    return {
      version: 2,
      grid: {
        cols: Math.max(Number(input.grid.cols) || 0, DEFAULT_LAYOUT.grid.cols),
        rows: Math.max(Number(input.grid.rows) || 0, DEFAULT_LAYOUT.grid.rows),
      },
      columns: [],
      items: input.items.map(normalizeItem),
    }
  }

  // migrate old column model
  if (input && Array.isArray(input.columns)) {
    const migrated: LayoutItem[] = []
    const fallback = cloneLayout(DEFAULT_LAYOUT)
    let yCursor = 0

    input.columns.forEach((column: any, columnIndex: number) => {
      const blocks = Array.isArray(column?.blocks) ? column.blocks : []
      blocks.forEach((block: any, blockIndex: number) => {
        const fallbackItem = fallback.items.find((entry) => entry.id === block.id)
        const w = legacyWidthToCols(block.width)
        const h = fallbackItem?.h || 2
        const x = clamp(columnIndex * 3, 0, fallback.grid.cols - w)
        const y = Math.max(yCursor, blockIndex * 2)
        migrated.push({
          id: block.id,
          x,
          y,
          w,
          h,
          hidden: isItemHidden(block),
          locked: Boolean(block.locked),
          collapsed: Boolean(block.collapsed),
        })
      })
      yCursor += 1
    })

    if (migrated.length) {
      return {
        version: 2,
        grid: { ...fallback.grid },
        columns: [],
        items: compactIntoGrid(migrated, fallback.grid),
      }
    }
  }

  return cloneLayout(DEFAULT_LAYOUT)
}

function normalizeItem(item: any): LayoutItem {
  const fallback = DEFAULT_LAYOUT.items.find((entry) => entry.id === item?.id)
  return {
    id: item?.id || fallback?.id,
    x: Number.isFinite(item?.x) ? item.x : fallback?.x || 0,
    y: Number.isFinite(item?.y) ? item.y : fallback?.y || 0,
    w: Number.isFinite(item?.w) ? item.w : fallback?.w || 2,
    h: Number.isFinite(item?.h) ? item.h : fallback?.h || 2,
    hidden: isItemHidden(item),
    locked: Boolean(item?.locked),
    collapsed: Boolean(item?.collapsed),
  }
}

function cloneLayout(layout: LayoutState): LayoutState {
  return {
    version: 2,
    grid: { ...layout.grid },
    columns: [],
    items: layout.items.map((item) => ({ ...item })),
  }
}

function isItemHidden(item: { hidden?: boolean; visible?: boolean }) {
  if (typeof item.hidden === 'boolean') return item.hidden
  if (typeof item.visible === 'boolean') return !item.visible
  return false
}

function legacyWidthToCols(width?: string) {
  if (width === 'third') return 1
  if (width === 'half') return 2
  if (width === 'full') return 3
  return 2
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function rectsOverlap(a: LayoutItem, b: LayoutItem) {
  return !(
    a.x + a.w <= b.x ||
    b.x + b.w <= a.x ||
    a.y + a.h <= b.y ||
    b.y + b.h <= a.y
  )
}

function canPlace(
  candidate: LayoutItem,
  items: LayoutItem[],
  grid: LayoutState['grid']
) {
  if (candidate.x < 0 || candidate.y < 0) return false
  if (candidate.x + candidate.w > grid.cols) return false
  if (candidate.y + candidate.h > grid.rows) return false

  for (const item of items) {
    if (item.id === candidate.id) continue
    if (isItemHidden(item)) continue
    if (rectsOverlap(candidate, item)) return false
  }
  return true
}

function compactIntoGrid(items: LayoutItem[], grid: LayoutState['grid']) {
  const placed: LayoutItem[] = []
  for (const item of items) {
    const normalized = { ...item }
    let placedItem = false
    for (let y = 0; y <= grid.rows - normalized.h && !placedItem; y += 1) {
      for (let x = 0; x <= grid.cols - normalized.w && !placedItem; x += 1) {
        const candidate = { ...normalized, x, y }
        if (canPlace(candidate, placed, grid)) {
          placed.push(candidate)
          placedItem = true
        }
      }
    }
    if (!placedItem) {
      placed.push({
        ...normalized,
        x: clamp(normalized.x, 0, Math.max(grid.cols - normalized.w, 0)),
        y: clamp(normalized.y, 0, Math.max(grid.rows - normalized.h, 0)),
      })
    }
  }
  return placed
}
