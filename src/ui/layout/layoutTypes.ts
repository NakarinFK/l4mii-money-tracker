import type { BlockId } from '../blocks/blockCatalog'

export type BlockSizePreset =
  | '1x2'
  | '2x2'
  | '3x2'
  | '1x3'
  | '2x3'
  | '3x3'

// Legacy compatibility for old column-based UI components.
export type BlockWidth = 'full' | 'half' | 'third' | 'auto'

export type GridSize = {
  cols: number
  rows: number
}

export type LayoutItem = {
  id: BlockId
  x: number
  y: number
  w: number
  h: number
  hidden?: boolean
  locked?: boolean
  visible?: boolean
  collapsed?: boolean
  accentColor?: string
}

export type LayoutState = {
  version: 2
  grid: GridSize
  items: LayoutItem[]
  columns: LayoutColumn[]
}

// Legacy compatibility for old column-based UI components.
export type LayoutBlock = {
  id: BlockId
  hidden?: boolean
  locked?: boolean
  width?: BlockWidth
  visible?: boolean
  collapsed?: boolean
}

export type LayoutColumn = {
  id: string
  blocks: LayoutBlock[]
}

export type LayoutAction =
  | {
      type: 'MOVE_ITEM_TO_CELL'
      payload: {
        id: BlockId
        x: number
        y: number
      }
    }
  | {
      type: 'RESIZE_ITEM'
      payload: {
        id: BlockId
        w: number
        h: number
      }
    }
  | {
      type: 'TOGGLE_BLOCK_VISIBILITY'
      payload: {
        id: BlockId
      }
    }
  | {
      type: 'RESET_LAYOUT'
    }
  | {
      type: 'TOGGLE_COLLAPSE'
      payload: {
        id: BlockId
      }
    }
  | {
      type: 'SET_ACCENT_COLOR'
      payload: { id: BlockId; color: string | undefined }
    }
  | {
      type: 'SET_ACCENT_COLOR_ALL'
      payload: { color: string | undefined }
    }
