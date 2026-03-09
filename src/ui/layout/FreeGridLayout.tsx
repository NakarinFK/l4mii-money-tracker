import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useDraggable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragMoveEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { BLOCK_CATALOG } from '../blocks/blockCatalog'
import type { BlockContext, BlockDefinition } from '../blocks/blockCatalog'
import type { BlockId } from '../blocks/blockCatalog'
import type { LayoutItem, LayoutState } from './layoutTypes'
import { GripVertical, ChevronDown, MoreVertical } from 'lucide-react'

const ACCENT_COLORS = [
  { label: 'Purple 60', value: '#8a3ffc' },
  { label: 'Blue 50',   value: '#4589ff' },
  { label: 'Teal 70',   value: '#08bdba' },
  { label: 'Teal 60',   value: '#007d79' },
  { label: 'Green 30',  value: '#6fdc8c' },
  { label: 'Cyan 20',   value: '#bae6ff' },
  { label: 'Magenta 40',value: '#ff7eb6' },
  { label: 'Purple 30', value: '#d4bbff' },
  { label: 'Red 10',    value: '#fff1f1' },
]

type Props = {
  layoutState: LayoutState
  blockContext: BlockContext
  onMoveItem: (payload: { id: BlockId; x: number; y: number }) => void
  onResizeItem: (payload: { id: BlockId; w: number; h: number }) => void
  onToggleVisibility: (id: BlockId) => void
  onResetLayout: () => void
  onToggleCollapse: (id: BlockId) => void
  onSetAccentColor: (id: BlockId | null, color: string | undefined) => void
}

type DragState = {
  id: BlockId
  startX: number
  startY: number
}

type ResizeEdge = 'right' | 'bottom' | 'corner'

type ResizeState = {
  id: BlockId
  edge: ResizeEdge
  startClientX: number
  startClientY: number
  startW: number
  startH: number
}

type ResizePreview = {
  id: BlockId
  x: number
  y: number
  w: number
  h: number
}

export default function FreeGridLayout({
  layoutState,
  blockContext,
  onMoveItem,
  onResizeItem,
  onToggleVisibility,
  onResetLayout,
  onToggleCollapse,
  onSetAccentColor,
}: Props) {
  const [isLayoutLocked, setIsLayoutLocked] = useState(false)
  const [activeId, setActiveId] = useState<BlockId | null>(null)
  const [dragState, setDragState] = useState<DragState | null>(null)
  const [resizeState, setResizeState] = useState<ResizeState | null>(null)
  const [resizePreview, setResizePreview] = useState<ResizePreview | null>(null)
  const [previewPos, setPreviewPos] = useState<{ x: number; y: number } | null>(
    null
  )
  const gridRef = useRef<HTMLDivElement | null>(null)
  const [gridWidth, setGridWidth] = useState(0)

  const items = layoutState.items
  const grid = layoutState.grid

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  useEffect(() => {
    const node = gridRef.current
    if (!node) return

    const update = () => setGridWidth(node.clientWidth)
    update()

    const observer = new ResizeObserver(update)
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  const cellWidth = useMemo(() => {
    const width = gridWidth || 980
    return Math.max(width / grid.cols, 56)
  }, [gridWidth, grid.cols])

  const cellHeight = useMemo(() => Math.max(Math.round(cellWidth * 0.7), 52), [cellWidth])

  const hiddenItems = useMemo(
    () => items.filter((item) => isItemHidden(item)),
    [items]
  )

  const activeItem = useMemo(
    () => items.find((item) => item.id === activeId) || null,
    [items, activeId]
  )

  const visibleItems = useMemo(
    () => items.filter((item) => !isItemHidden(item)),
    [items]
  )

  const handleDragStart = (event: DragStartEvent) => {
    if (isLayoutLocked || resizeState) return
    const id = String(event.active.id) as BlockId
    const item = items.find((entry) => entry.id === id)
    if (!item || item.locked) return

    setActiveId(id)
    setDragState({ id, startX: item.x, startY: item.y })
    setPreviewPos({ x: item.x, y: item.y })
  }

  const handleDragMove = (event: DragMoveEvent) => {
    if (!dragState || !activeItem) return
    const nextX = dragState.startX + Math.round(event.delta.x / cellWidth)
    const nextY = dragState.startY + Math.round(event.delta.y / cellHeight)

    const candidate = {
      ...activeItem,
      x: clamp(nextX, 0, grid.cols - activeItem.w),
      y: clamp(nextY, 0, grid.rows - activeItem.h),
    }

    const resolved = canPlace(candidate, visibleItems)
      ? { x: candidate.x, y: candidate.y }
      : findNearestAvailablePosition(candidate, visibleItems, grid)

    setPreviewPos(resolved)
  }

  const handleDragEnd = (_event: DragEndEvent) => {
    if (activeId && previewPos) {
      onMoveItem({ id: activeId, x: previewPos.x, y: previewPos.y })
    }
    setActiveId(null)
    setDragState(null)
    setPreviewPos(null)
  }

  const handleDragCancel = () => {
    setActiveId(null)
    setDragState(null)
    setPreviewPos(null)
  }

  const handleResizeStart = (
    itemId: BlockId,
    event: React.MouseEvent<HTMLDivElement>,
    edge: ResizeEdge
  ) => {
    if (isLayoutLocked) return
    const item = items.find((entry) => entry.id === itemId)
    if (!item || item.locked) return

    event.preventDefault()
    event.stopPropagation()

    setResizeState({
      id: itemId,
      edge,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startW: item.w,
      startH: item.h,
    })
    setResizePreview({
      id: itemId,
      x: item.x,
      y: item.y,
      w: item.w,
      h: item.h,
    })
  }

  useEffect(() => {
    if (!resizeState) return

    const handleMove = (event: MouseEvent) => {
      const item = items.find((entry) => entry.id === resizeState.id)
      if (!item) return

      const deltaCols = Math.round((event.clientX - resizeState.startClientX) / cellWidth)
      const deltaRows = Math.round((event.clientY - resizeState.startClientY) / cellHeight)

      let nextW = resizeState.startW
      let nextH = resizeState.startH

      if (resizeState.edge === 'right' || resizeState.edge === 'corner') {
        nextW = clamp(resizeState.startW + deltaCols, 1, 30)
      }
      if (resizeState.edge === 'bottom' || resizeState.edge === 'corner') {
        nextH = clamp(resizeState.startH + deltaRows, 1, 30)
      }

      nextW = clamp(nextW, 1, grid.cols - item.x)
      nextH = clamp(nextH, 1, grid.rows - item.y)

      const candidate = {
        ...item,
        w: nextW,
        h: nextH,
      }

      const visible = items.filter((entry) => !isItemHidden(entry))
      const target = canPlace(candidate, visible)
        ? { x: candidate.x, y: candidate.y }
        : findNearestAvailablePosition(candidate, visible, grid)

      setResizePreview({
        id: item.id,
        x: target.x,
        y: target.y,
        w: nextW,
        h: nextH,
      })
    }

    const handleUp = () => {
      if (resizePreview) {
        onMoveItem({ id: resizePreview.id, x: resizePreview.x, y: resizePreview.y })
        onResizeItem({ id: resizePreview.id, w: resizePreview.w, h: resizePreview.h })
      }
      setResizeState(null)
      setResizePreview(null)
    }

    window.addEventListener('mousemove', handleMove)
    window.addEventListener('mouseup', handleUp)
    return () => {
      window.removeEventListener('mousemove', handleMove)
      window.removeEventListener('mouseup', handleUp)
    }
  }, [resizeState, resizePreview, items, grid, cellWidth, cellHeight, onMoveItem, onResizeItem])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-gray-200 bg-white p-3 dark:border-[#212631] dark:bg-[#0A0E15]">
        <div className="flex flex-wrap items-center gap-1.5 text-[13px]">
          {hiddenItems.length ? (
            <>
              <span className="font-medium text-gray-500 dark:text-gray-400">Hidden:</span>
              {hiddenItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onToggleVisibility(item.id)}
                  className="rounded-md bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-600 transition-colors hover:bg-blue-100 dark:bg-blue-500/10 dark:text-blue-400 dark:hover:bg-blue-500/20"
                >
                  {getBlockLabel(item.id)}
                </button>
              ))}
            </>
          ) : (
            <span className="text-xs text-gray-400 dark:text-gray-500">
              All blocks visible · Grid {grid.cols}x{grid.rows}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => {
              if (window.confirm('Reset grid layout to default?')) onResetLayout()
            }}
            className="rounded-lg px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-[#212631] dark:hover:text-gray-200"
          >
            Reset Grid
          </button>
          <button
            type="button"
            onClick={() => setIsLayoutLocked((prev) => !prev)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              isLayoutLocked
                ? 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400'
                : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-[#212631]'
            }`}
          >
            {isLayoutLocked ? 'Locked' : 'Lock'}
          </button>
        </div>
      </div>

      <DndContext
        sensors={isLayoutLocked ? [] : sensors}
        onDragStart={handleDragStart}
        onDragMove={handleDragMove}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div
          ref={gridRef}
          style={{
            position: 'relative',
            minHeight: grid.rows * cellHeight,
            borderRadius: 10,
            border: '1px solid var(--border)',
            background: 'var(--grid-bg, var(--surface))',
            backgroundImage: isLayoutLocked
              ? 'var(--grid-gradient, none)'
              : [
                  'var(--grid-gradient, none)',
                  'radial-gradient(circle, var(--border) 1.5px, transparent 1.5px)',
                ].filter(Boolean).join(', '),
            backgroundSize: isLayoutLocked
              ? 'auto'
              : `auto, ${cellWidth}px ${cellHeight}px`,
            overflow: 'hidden',
          }}
        >
          {visibleItems.map((item) => {
            const isActive = item.id === activeId
            const preview = resizePreview && resizePreview.id === item.id ? resizePreview : null
            const x = preview ? preview.x : isActive && previewPos ? previewPos.x : item.x
            const y = preview ? preview.y : isActive && previewPos ? previewPos.y : item.y
            const w = preview ? preview.w : item.w
            const h = preview ? preview.h : item.h

            return (
              <GridCard
                key={item.id}
                item={item}
                x={x}
                y={y}
                w={w}
                h={h}
                cellWidth={cellWidth}
                cellHeight={cellHeight}
                isLayoutLocked={isLayoutLocked}
                isActive={isActive}
                blockContext={blockContext}
                onToggleVisibility={onToggleVisibility}
                onResizeStart={handleResizeStart}
                onToggleCollapse={onToggleCollapse}
                onSetAccentColor={onSetAccentColor}
              />
            )
          })}
        </div>

        <DragOverlay>
          {activeItem ? <GhostCard id={activeItem.id} /> : null}
        </DragOverlay>
      </DndContext>
    </div>
  )
}

function GridCard({
  item,
  x,
  y,
  w,
  h,
  cellWidth,
  cellHeight,
  isLayoutLocked,
  isActive,
  blockContext,
  onToggleVisibility,
  onResizeStart,
  onToggleCollapse,
  onSetAccentColor,
}: {
  item: LayoutItem
  x: number
  y: number
  w: number
  h: number
  cellWidth: number
  cellHeight: number
  isLayoutLocked: boolean
  isActive: boolean
  blockContext: BlockContext
  onToggleVisibility: (id: BlockId) => void
  onResizeStart: (
    id: BlockId,
    event: React.MouseEvent<HTMLDivElement>,
    edge: ResizeEdge
  ) => void
  onToggleCollapse: (id: BlockId) => void
  onSetAccentColor: (id: BlockId | null, color: string | undefined) => void
}) {
  const definition: BlockDefinition | undefined = BLOCK_CATALOG[item.id]
  const { attributes, listeners, setNodeRef } = useDraggable({
    id: item.id,
    disabled: isLayoutLocked || Boolean(item.locked),
  })

  if (!definition) return null
  if (isItemHidden(item)) return null

  const Component = definition.Component
  const props = definition.getProps(blockContext)

  // Scale content to fit card width instead of clipping/scrolling
  const NATURAL_CONTENT_WIDTH = 300
  const cardBodyPixelWidth = w * cellWidth - 12 // 6px padding each side
  const contentScale = Math.min(1, cardBodyPixelWidth / NATURAL_CONTENT_WIDTH)

  return (
    <div
      ref={setNodeRef}
      style={{
        position: 'absolute',
        left: x * cellWidth,
        top: y * cellHeight,
        width: w * cellWidth,
        height: h * cellHeight,
        padding: 6,
        zIndex: isActive ? 25 : 10,
        opacity: isActive ? 0.35 : 1,
        transition: isActive ? 'none' : 'left 120ms ease, top 120ms ease',
      }}
    >
      <div
        className="notion-card"
        data-accent={item.accentColor ? 'true' : undefined}
        style={{
          position: 'relative',
          height: '100%',
          overflow: 'hidden',
          ...(item.accentColor ? { '--card-accent': item.accentColor } as React.CSSProperties : {}),
        }}
      >
        <div className="notion-card-header">
          <button
            type="button"
            {...attributes}
            {...listeners}
            className="drag-handle"
            title="Drag card"
          >
            <GripVertical size={14} />
          </button>

          <span className="card-title">{definition.label}</span>

          <div className="card-actions">
            <button
              type="button"
              className="card-action-btn"
              onClick={() => onToggleCollapse(item.id)}
              title={item.collapsed ? 'Expand' : 'Collapse'}
            >
              <ChevronDown
                size={14}
                style={{ transform: item.collapsed ? 'rotate(-90deg)' : 'none', transition: 'transform 0.15s' }}
              />
            </button>
            <CardSizeMenu
              item={item}
              onHide={onToggleVisibility}
              onSetAccentColor={onSetAccentColor}
            />
          </div>
        </div>

        {!item.collapsed ? (
          <div className="notion-card-body" style={{ height: 'calc(100% - 40px)', overflow: 'hidden' }}>
            <div style={{
              width: contentScale < 1 ? `${100 / contentScale}%` : '100%',
              transformOrigin: 'top left',
              transform: contentScale < 1 ? `scale(${contentScale})` : undefined,
            }}>
              <Component {...props} />
            </div>
          </div>
        ) : null}

        {!isLayoutLocked && !item.locked ? (
          <>
            <div
              onMouseDown={(event) => onResizeStart(item.id, event, 'right')}
              title="Resize width"
              style={{
                position: 'absolute',
                top: 40,
                right: 0,
                width: 8,
                height: 'calc(100% - 40px)',
                cursor: 'ew-resize',
                background: 'transparent',
              }}
            />
            <div
              onMouseDown={(event) => onResizeStart(item.id, event, 'bottom')}
              title="Resize height"
              style={{
                position: 'absolute',
                left: 0,
                bottom: 0,
                width: '100%',
                height: 8,
                cursor: 'ns-resize',
                background: 'transparent',
              }}
            />
            <div
              onMouseDown={(event) => onResizeStart(item.id, event, 'corner')}
              title="Resize card"
              style={{
                position: 'absolute',
                right: 0,
                bottom: 0,
                width: 14,
                height: 14,
                cursor: 'nwse-resize',
                borderTopLeftRadius: 6,
                background: 'var(--surface-muted)',
                borderLeft: '1px solid var(--border)',
                borderTop: '1px solid var(--border)',
              }}
            />
          </>
        ) : null}
      </div>
    </div>
  )
}

function CardSizeMenu({
  item,
  onHide,
  onSetAccentColor,
}: {
  item: LayoutItem
  onHide: (id: BlockId) => void
  onSetAccentColor: (id: BlockId | null, color: string | undefined) => void
}) {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return
    const onDocClick = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onEscape)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onEscape)
    }
  }, [isOpen])

  const currentKey = `${item.w}x${item.h}`

  return (
    <div className="notion-menu-wrapper" ref={menuRef}>
      <button
        type="button"
        className="card-action-btn"
        onClick={() => setIsOpen((prev) => !prev)}
        onPointerDown={(event) => event.stopPropagation()}
        title="Card options"
      >
        <MoreVertical size={14} />
      </button>

      {isOpen ? (
        <div className="notion-menu" style={{ minWidth: 220 }}>
          <div className="notion-menu-label">Title Color</div>
          <div style={{ padding: '6px 12px 8px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6 }}>
              {/* None swatch */}
              <button
                type="button"
                title="None"
                onClick={() => { onSetAccentColor(item.id, undefined); setIsOpen(false) }}
                style={{
                  width: 28, height: 28, borderRadius: 6, cursor: 'pointer',
                  border: item.accentColor ? '2px solid var(--border)' : '2px solid var(--text)',
                  background: 'var(--surface-muted)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 10, color: 'var(--text-muted)',
                }}
              >
                ✕
              </button>
              {ACCENT_COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  title={c.label}
                  onClick={() => { onSetAccentColor(item.id, c.value); setIsOpen(false) }}
                  style={{
                    width: 28, height: 28, borderRadius: 6, cursor: 'pointer',
                    background: c.value,
                    border: item.accentColor === c.value
                      ? '2px solid var(--text)'
                      : '2px solid transparent',
                    outline: item.accentColor === c.value ? '1px solid var(--border)' : 'none',
                  }}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={() => { onSetAccentColor(null, item.accentColor); setIsOpen(false) }}
              style={{
                marginTop: 8, width: '100%', padding: '4px 0',
                fontSize: 11, color: 'var(--text-muted)', cursor: 'pointer',
                background: 'transparent', border: 'none', textAlign: 'center',
              }}
            >
              Apply to all cards
            </button>
          </div>
          <div className="notion-menu-divider" />
          <div className="notion-menu-label">Size</div>
          <div className="notion-menu-item" style={{ cursor: 'default' }}>
            <span className="menu-label">Current: {currentKey} · drag edges to resize</span>
          </div>
          <div className="notion-menu-divider" />
          <button
            type="button"
            className="notion-menu-item"
            onClick={() => {
              onHide(item.id)
              setIsOpen(false)
            }}
          >
            <span className="menu-label">Hide block</span>
          </button>
        </div>
      ) : null}
    </div>
  )
}

function canPlace(candidate: LayoutItem, items: LayoutItem[]) {
  for (const item of items) {
    if (item.id === candidate.id) continue
    if (isItemHidden(item)) continue
    if (rectsOverlap(candidate, item)) return false
  }
  return true
}

function findNearestAvailablePosition(
  candidate: LayoutItem,
  items: LayoutItem[],
  grid: LayoutState['grid']
) {
  const maxRadius = Math.max(grid.cols, grid.rows)

  for (let radius = 0; radius <= maxRadius; radius += 1) {
    for (let dy = -radius; dy <= radius; dy += 1) {
      for (let dx = -radius; dx <= radius; dx += 1) {
        if (Math.abs(dx) !== radius && Math.abs(dy) !== radius) continue
        const x = clamp(candidate.x + dx, 0, grid.cols - candidate.w)
        const y = clamp(candidate.y + dy, 0, grid.rows - candidate.h)
        const next = { ...candidate, x, y }
        if (canPlace(next, items)) {
          return { x, y }
        }
      }
    }
  }

  return { x: candidate.x, y: candidate.y }
}

function rectsOverlap(a: LayoutItem, b: LayoutItem) {
  return !(
    a.x + a.w <= b.x ||
    b.x + b.w <= a.x ||
    a.y + a.h <= b.y ||
    b.y + b.h <= a.y
  )
}

function isItemHidden(item: { hidden?: boolean; visible?: boolean }) {
  if (typeof item.hidden === 'boolean') return item.hidden
  if (typeof item.visible === 'boolean') return !item.visible
  return false
}

function getBlockLabel(id: BlockId) {
  return BLOCK_CATALOG[id]?.label || id
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function GhostCard({ id }: { id: BlockId }) {
  return (
    <div style={{ pointerEvents: 'none' }}>
      <div className="rounded-xl border-2 border-blue-500 bg-white px-4 py-2.5 shadow-lg dark:bg-[#0A0E15] dark:shadow-none" style={{ width: 240, opacity: 0.9 }}>
        <span className="text-sm font-semibold text-gray-900 dark:text-zinc-50">
          {getBlockLabel(id)}
        </span>
      </div>
    </div>
  )
}
