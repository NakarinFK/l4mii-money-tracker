import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  DndContext,
  closestCenter,
  DragOverlay,
  useDraggable,
  KeyboardSensor,
  PointerSensor,
  pointerWithin,
  useDroppable,
  type DragEndEvent,
  type DragMoveEvent,
  type DragOverEvent,
  type DragStartEvent,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { BLOCK_CATALOG } from '../blocks/blockCatalog'
import type { BlockId } from '../blocks/blockCatalog'
import type { BlockWidth, LayoutColumn, LayoutState } from './layoutTypes'
import type { BlockContext, BlockDefinition } from '../blocks/blockCatalog'
import { useTheme } from '../theme/useTheme'

type Props = {
  layoutState: LayoutState
  blockContext: BlockContext
  onMoveBlock: (payload: {
    blockId: string
    fromColumnId: string
    toColumnId: string
    toIndex: number
  }) => void
  onToggleVisibility: (id: string) => void
  onResetLayout: () => void
  onAddColumn: () => void
  onRemoveColumn: (payload?: { id?: string; force?: boolean }) => void
  onSetBlockWidth: (id: string, width: BlockWidth) => void
}

type ResizeState = {
  blockId: string
  startX: number
  columnWidth: number
  startWidth: BlockWidth
  previewWidth: BlockWidth
  edge: 'left' | 'right'
}

export default function DashboardLayout({
  layoutState,
  blockContext,
  onMoveBlock,
  onToggleVisibility,
  onResetLayout,
  onAddColumn,
  onRemoveColumn,
  onSetBlockWidth,
}: Props) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const [resizeState, setResizeState] = useState<ResizeState | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isLayoutLocked, setIsLayoutLocked] = useState(false)
  const [activeColumnId, setActiveColumnId] = useState<string | null>(null)
  const [pointerX, setPointerX] = useState<number | null>(null)
  const [collapsedBlocks, setCollapsedBlocks] = useState<Set<string>>(new Set())
  const toggleCollapse = (blockId: string) => {
    setCollapsedBlocks((prev) => {
      const next = new Set(prev)
      if (next.has(blockId)) next.delete(blockId)
      else next.add(blockId)
      return next
    })
  }
  const columns = layoutState.columns
  const totalColumns = Math.max(columns.length, 1)
  const gridRef = useRef<HTMLDivElement | null>(null)
  const columnRefs = useRef<Map<string, HTMLDivElement | null>>(new Map())
  const { theme, toggleTheme } = useTheme()
  const hiddenBlocks = useMemo(
    () =>
      columns.flatMap((column) =>
        column.blocks.filter((block) => isBlockHidden(block))
      ),
    [columns]
  )
  const blockIds = useMemo(
    () => new Set(columns.flatMap((column) => column.blocks.map((block) => block.id))),
    [columns]
  )
  const activeBlock = useMemo(
    () =>
      columns
        .flatMap((column) => column.blocks)
        .find((block) => block.id === activeId) || null,
    [columns, activeId]
  )

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const collisionDetection = (args: any) => {
    const pointer = pointerWithin(args)
    if (pointer?.length) {
      const blockCollision = pointer.find((entry: any) =>
        blockIds.has(entry.id as BlockId)
      )
      return blockCollision ? [blockCollision] : pointer
    }
    return closestCenter(args)
  }

  const handleDragStart = (event: DragStartEvent) => {
    const id = String(event.active.id)
    const block = findBlock(columns, id)
    if (block && !isBlockLocked(block)) {
      setActiveId(id)
      setIsDragging(true)
      const column = findColumnByBlockId(columns, id)
      setActiveColumnId(column?.id || null)
    }
  }

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event
    if (!over) {
      setActiveColumnId(null)
      return
    }
    const activeIdValue = String(active.id)
    const overIdValue = String(over.id)
    if (activeIdValue === overIdValue) return

    const activeBlockValue = findBlock(columns, activeIdValue)
    if (!activeBlockValue || isBlockLocked(activeBlockValue)) return

    const fromColumn = findColumnByBlockId(columns, activeIdValue)
    const toColumn = resolveColumnForOver(columns, overIdValue)
    if (!fromColumn || !toColumn) return
    if (fromColumn.id === toColumn.id) return

    const visibleBlocks = getVisibleBlocks(toColumn)
    const toIndex = mapVisibleIndexToActualIndex(
      toColumn.blocks,
      visibleBlocks.length
    )

    onMoveBlock({
      blockId: activeIdValue,
      fromColumnId: fromColumn.id,
      toColumnId: toColumn.id,
      toIndex,
    })
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over) {
      setActiveId(null)
      setIsDragging(false)
      setActiveColumnId(null)
      setPointerX(null)
      return
    }
    const activeIdValue = String(active.id)
    const overIdValue = String(over.id)
    if (activeIdValue !== overIdValue) {
      const movePayload = resolveMovePayload(
        columns,
        activeIdValue,
        overIdValue
      )
      if (movePayload) {
        onMoveBlock(movePayload)
      }
    }
    setActiveId(null)
    setIsDragging(false)
    setActiveColumnId(null)
    setPointerX(null)
  }

  const handleDragCancel = () => {
    setActiveId(null)
    setIsDragging(false)
    setActiveColumnId(null)
    setPointerX(null)
  }

  useEffect(() => {
    if (!isDragging) return
    const handleMove = (event: PointerEvent) => {
      setPointerX(event.clientX)
    }
    window.addEventListener('pointermove', handleMove)
    return () => {
      window.removeEventListener('pointermove', handleMove)
    }
  }, [isDragging])

  useEffect(() => {
    if (!isDragging || pointerX === null) {
      setActiveColumnId(null)
      return
    }
    let nextId: string | null = null
    for (const column of columns) {
      const node = columnRefs.current.get(column.id)
      if (!node) continue
      const rect = node.getBoundingClientRect()
      if (pointerX >= rect.left && pointerX <= rect.right) {
        nextId = column.id
        break
      }
    }
    setActiveColumnId(nextId)
  }, [pointerX, isDragging, columns])

  const registerColumnRef =
    (columnId: string) => (node: HTMLDivElement | null) => {
      if (node) {
        columnRefs.current.set(columnId, node)
      } else {
        columnRefs.current.delete(columnId)
      }
    }

  useEffect(() => {
    if (!resizeState) return

    const handleMove = (event: MouseEvent) => {
      const directionMultiplier = resizeState.edge === 'left' ? -1 : 1
      const deltaX =
        (event.clientX - resizeState.startX) * directionMultiplier
      const columnWidth = Math.max(resizeState.columnWidth, 1)
      const stepSize = columnWidth / 3
      const steps = Math.round(deltaX / stepSize)
      const startIndex = getResizeOrderIndex(resizeState.startWidth)
      const nextIndex = clampIndex(
        startIndex + steps,
        0,
        RESIZE_WIDTH_ORDER.length - 1
      )
      const previewWidth = RESIZE_WIDTH_ORDER[nextIndex]
      setResizeState((prev) =>
        prev ? { ...prev, previewWidth } : prev
      )
    }

    const handleUp = () => {
      const { blockId, previewWidth, startWidth } = resizeState
      if (previewWidth && previewWidth !== startWidth) {
        onSetBlockWidth(blockId, previewWidth)
      }
      setResizeState(null)
    }

    window.addEventListener('mousemove', handleMove)
    window.addEventListener('mouseup', handleUp)
    return () => {
      window.removeEventListener('mousemove', handleMove)
      window.removeEventListener('mouseup', handleUp)
    }
  }, [resizeState, onSetBlockWidth])

  const handleKeyboardMove = (
    blockId: string,
    direction: 'left' | 'right'
  ) => {
    const activeBlockValue = findBlock(columns, blockId)
    if (!activeBlockValue || isBlockLocked(activeBlockValue)) return
    const fromColumn = findColumnByBlockId(columns, blockId)
    if (!fromColumn) return
    const fromIndex = columns.findIndex(
      (column) => column.id === fromColumn.id
    )
    const toColumn =
      direction === 'left'
        ? columns[fromIndex - 1]
        : columns[fromIndex + 1]
    if (!toColumn) return
    const visibleBlocks = getVisibleBlocks(toColumn)
    const toIndex = mapVisibleIndexToActualIndex(
      toColumn.blocks,
      visibleBlocks.length
    )
    onMoveBlock({
      blockId,
      fromColumnId: fromColumn.id,
      toColumnId: toColumn.id,
      toIndex,
    })
  }

  const handleResizeStart = (
    blockId: string,
    startX: number,
    edge: 'left' | 'right'
  ) => {
    if (isLayoutLocked) return
    const block = findBlock(columns, blockId)
    if (!block || isBlockLocked(block)) return
    const gridWidth = gridRef.current?.getBoundingClientRect().width || 0
    const columnWidth = gridWidth / totalColumns
    if (!columnWidth) return
    const startWidth = block.width || 'auto'
    setResizeState({
      blockId,
      startX,
      columnWidth,
      startWidth,
      previewWidth: startWidth,
      edge,
    })
  }

  return (
    <div className="space-y-5">
      {/* Notion-style Toolbar */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
          padding: '8px 12px',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: '8px',
          boxShadow: 'var(--card-shadow)',
        }}
      >
        {/* Hidden blocks */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
          {hiddenBlocks.length ? (
            <>
              <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>Hidden:</span>
              {hiddenBlocks.map((block: any) => (
                <button
                  key={block.id}
                  type="button"
                  onClick={() => onToggleVisibility(block.id)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '3px 10px',
                    fontSize: '12px',
                    fontWeight: 500,
                    color: 'var(--accent)',
                    background: 'var(--accent-light)',
                    border: '1px solid transparent',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                  {getBlockLabel(block.id)}
                </button>
              ))}
            </>
          ) : (
            <span style={{ color: 'var(--text-disabled)', fontSize: '12px' }}>All blocks visible</span>
          )}
        </div>

        {/* Layout controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <button
            type="button"
            onClick={onAddColumn}
            className="card-action-btn"
            style={{ width: 'auto', height: '28px', padding: '0 8px', fontSize: '12px', fontWeight: 500, gap: '4px', display: 'inline-flex', alignItems: 'center', borderRadius: '4px', color: 'var(--text-muted)', background: 'transparent', border: 'none', cursor: 'pointer' }}
            title="Add column"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add
          </button>
          <button
            type="button"
            onClick={() => {
              const lastColumn = columns[columns.length - 1]
              if (!lastColumn) return
              if (columns.length <= 1) return
              if (window.confirm('Remove the last column?')) {
                onRemoveColumn({ id: lastColumn.id })
              }
            }}
            className="card-action-btn"
            style={{ width: 'auto', height: '28px', padding: '0 8px', fontSize: '12px', fontWeight: 500, gap: '4px', display: 'inline-flex', alignItems: 'center', borderRadius: '4px', color: 'var(--text-muted)', background: 'transparent', border: 'none', cursor: 'pointer' }}
            title="Remove column"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Remove
          </button>

          <div style={{ width: '1px', height: '16px', background: 'var(--border)', margin: '0 4px' }} />

          <button
            type="button"
            onClick={() => {
              if (window.confirm('Reset layout to default?')) {
                onResetLayout()
              }
            }}
            className="card-action-btn"
            style={{ width: 'auto', height: '28px', padding: '0 8px', fontSize: '12px', fontWeight: 500, gap: '4px', display: 'inline-flex', alignItems: 'center', borderRadius: '4px', color: 'var(--text-muted)', background: 'transparent', border: 'none', cursor: 'pointer' }}
            title="Reset layout"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="1 4 1 10 7 10" />
              <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
            </svg>
            Reset
          </button>
          <button
            type="button"
            onClick={() => setIsLayoutLocked((prev: any) => !prev)}
            className="card-action-btn"
            style={{
              width: 'auto',
              height: '28px',
              padding: '0 8px',
              fontSize: '12px',
              fontWeight: 500,
              gap: '4px',
              display: 'inline-flex',
              alignItems: 'center',
              borderRadius: '4px',
              color: isLayoutLocked ? 'var(--accent)' : 'var(--text-muted)',
              background: isLayoutLocked ? 'var(--accent-light)' : 'transparent',
              border: 'none',
              cursor: 'pointer',
            }}
            title={isLayoutLocked ? 'Unlock layout' : 'Lock layout'}
          >
            {isLayoutLocked ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 9.9-1" />
              </svg>
            )}
            {isLayoutLocked ? 'Locked' : 'Lock'}
          </button>

          <div style={{ width: '1px', height: '16px', background: 'var(--border)', margin: '0 4px' }} />

          <button
            type="button"
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="card-action-btn"
            style={{ width: 'auto', height: '28px', padding: '0 8px', fontSize: '12px', fontWeight: 500, gap: '4px', display: 'inline-flex', alignItems: 'center', borderRadius: '4px', color: 'var(--text-muted)', background: 'transparent', border: 'none', cursor: 'pointer' }}
          >
            {theme === 'dark' ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="5" />
                <line x1="12" y1="1" x2="12" y2="3" />
                <line x1="12" y1="21" x2="12" y2="23" />
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                <line x1="1" y1="12" x2="3" y2="12" />
                <line x1="21" y1="12" x2="23" y2="12" />
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            )}
            {theme === 'dark' ? 'Light' : 'Dark'}
          </button>
        </div>
      </div>

      <DndContext
        sensors={isLayoutLocked ? [] : sensors}
        collisionDetection={collisionDetection}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div
          ref={gridRef}
          className="relative flex items-stretch gap-6"
        >
          {columns.map((column) => (
            <Column
              key={column.id}
              column={column}
              blockContext={blockContext}
              onToggleVisibility={onToggleVisibility}
              onSetBlockWidth={onSetBlockWidth}
              onKeyboardMove={handleKeyboardMove}
              onCancelDrag={handleDragCancel}
              onResizeStart={handleResizeStart}
              resizeState={resizeState}
              isDragging={isDragging}
              isActive={activeColumnId === column.id}
              registerColumnRef={registerColumnRef}
              isLayoutLocked={isLayoutLocked}
              collapsedBlocks={collapsedBlocks}
              onToggleCollapse={toggleCollapse}
            />
          ))}
        </div>
        <DragOverlay>
          {activeBlock && !isBlockLocked(activeBlock) ? (
            <GhostBlock
              id={activeBlock.id}
              width={activeBlock.width || 'auto'}
            />
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  )
}

function CardMenu({
  blockId,
  width,
  isLayoutLocked,
  onSetBlockWidth,
  onToggleVisibility,
}: {
  blockId: string
  width: BlockWidth
  isLayoutLocked: boolean
  onSetBlockWidth: (id: string, width: BlockWidth) => void
  onToggleVisibility: (id: string) => void
}) {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen])

  const widthOptions: { value: BlockWidth; label: string }[] = [
    { value: 'auto', label: 'Auto' },
    { value: 'full', label: 'Full width' },
    { value: 'half', label: 'Half' },
    { value: 'third', label: 'Third' },
  ]

  return (
    <div className="notion-menu-wrapper" ref={menuRef}>
      <button
        type="button"
        className="card-action-btn"
        onClick={() => setIsOpen((prev) => !prev)}
        onPointerDown={(event: any) => event.stopPropagation()}
        aria-label="More options"
        title="More options"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="12" cy="5" r="2" />
          <circle cx="12" cy="12" r="2" />
          <circle cx="12" cy="19" r="2" />
        </svg>
      </button>
      {isOpen ? (
        <div className="notion-menu">
          <div className="notion-menu-label">Size</div>
          {widthOptions.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={`notion-menu-item ${width === opt.value ? 'active' : ''}`}
              onClick={() => {
                onSetBlockWidth(blockId, opt.value)
                setIsOpen(false)
              }}
            >
              <svg className="menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                {opt.value === 'full' && <><rect x="3" y="3" width="18" height="18" rx="2" /></>}
                {opt.value === 'half' && <><rect x="3" y="3" width="18" height="18" rx="2" /><line x1="12" y1="3" x2="12" y2="21" /></>}
                {opt.value === 'third' && <><rect x="3" y="3" width="18" height="18" rx="2" /><line x1="10" y1="3" x2="10" y2="21" /><line x1="14" y1="3" x2="14" y2="21" /></>}
                {opt.value === 'auto' && <><rect x="3" y="3" width="18" height="18" rx="2" strokeDasharray="4 2" /></>}
              </svg>
              <span className="menu-label">{opt.label}</span>
              {width === opt.value ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : null}
            </button>
          ))}
          <div className="notion-menu-divider" />
          <button
            type="button"
            className="notion-menu-item"
            onClick={() => {
              if (!isLayoutLocked) onToggleVisibility(blockId)
              setIsOpen(false)
            }}
            disabled={isLayoutLocked}
          >
            <svg className="menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
              <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
              <line x1="1" y1="1" x2="23" y2="23" />
            </svg>
            <span className="menu-label">Hide block</span>
          </button>
        </div>
      ) : null}
    </div>
  )
}

function SortableBlock({
  id,
  blockContext,
  locked,
  onToggleVisibility,
  width,
  onSetBlockWidth,
  onKeyboardMove,
  onCancelDrag,
  onResizeStart,
  resizeState,
  isLayoutLocked,
  isCollapsed,
  onToggleCollapse,
}: {
  id: keyof typeof BLOCK_CATALOG
  blockContext: BlockContext
  locked: boolean
  onToggleVisibility: (id: string) => void
  width: BlockWidth
  onSetBlockWidth: (id: string, width: BlockWidth) => void
  onKeyboardMove: (blockId: string, direction: 'left' | 'right') => void
  onCancelDrag: () => void
  onResizeStart: (
    blockId: string,
    startX: number,
    edge: 'left' | 'right'
  ) => void
  resizeState: ResizeState | null
  isLayoutLocked: boolean
  isCollapsed: boolean
  onToggleCollapse: (blockId: string) => void
}) {
  const definition: BlockDefinition | undefined = BLOCK_CATALOG[id]
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
    isOver,
  } = useSortable({ id, disabled: locked || isLayoutLocked })

  if (!definition) return null
  const Component = definition.Component
  const props = definition.getProps(blockContext)
  const style = {
    transform: transform
      ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
      : undefined,
    transition,
    opacity: isDragging ? 0.8 : undefined,
  }
  const isResizing = resizeState?.blockId === id
  const effectiveWidth = isResizing ? resizeState.previewWidth : width
  const widthStyle = getWidthStyle(effectiveWidth)
  const handleKeyDown = (event: React.KeyboardEvent) => {
    const target = event.target as HTMLElement | null
    if (
      target?.closest(
        'input, textarea, select, button, a, [contenteditable="true"]'
      )
    ) {
      return
    }
    if (isLayoutLocked || locked) return
    if (event.shiftKey && event.key === 'ArrowLeft') {
      event.preventDefault()
      onSetBlockWidth(id, getAdjacentWidth(width, 'left'))
      return
    }
    if (event.shiftKey && event.key === 'ArrowRight') {
      event.preventDefault()
      onSetBlockWidth(id, getAdjacentWidth(width, 'right'))
      return
    }
    if (event.key === 'ArrowLeft') {
      event.preventDefault()
      onKeyboardMove(id, 'left')
      return
    }
    if (event.key === 'ArrowRight') {
      event.preventDefault()
      onKeyboardMove(id, 'right')
      return
    }
    if (event.key === 'Escape') {
      event.preventDefault()
      onCancelDrag()
    }
  }
  const label = definition.label

  return (
    <div
      ref={setNodeRef}
      style={{ ...style, ...widthStyle }}
      className={`group relative self-start transition-all duration-200 notion-drop-indicator ${
        isOver && !isDragging ? 'over' : ''
      } ${isResizing ? 'opacity-90' : ''} ${isLayoutLocked ? 'cursor-text' : ''}`}
      {...attributes}
      tabIndex={locked ? -1 : 0}
      onKeyDown={handleKeyDown}
    >
      <div className={`notion-card ${isDragging ? 'notion-card-dragging' : ''}`}>
        {/* Card Header */}
        <div className="notion-card-header">
          {/* Drag Handle */}
          {!locked && !isLayoutLocked ? (
            <div
              className="drag-handle"
              {...(listeners || {})}
              aria-label="Drag to reorder"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
                <circle cx="4" cy="3" r="1.2" />
                <circle cx="10" cy="3" r="1.2" />
                <circle cx="4" cy="7" r="1.2" />
                <circle cx="10" cy="7" r="1.2" />
                <circle cx="4" cy="11" r="1.2" />
                <circle cx="10" cy="11" r="1.2" />
              </svg>
            </div>
          ) : null}

          {/* Card Title */}
          <span className="card-title">{label}</span>

          {/* Card Actions */}
          <div className="card-actions">
            {/* Collapse/Expand */}
            <button
              type="button"
              className="card-action-btn"
              onClick={() => onToggleCollapse(id)}
              onPointerDown={(event: any) => event.stopPropagation()}
              aria-label={isCollapsed ? 'Expand block' : 'Collapse block'}
              title={isCollapsed ? 'Expand' : 'Collapse'}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{
                  transition: 'transform 0.2s ease',
                  transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
                }}
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
            {/* Hide */}
            <button
              type="button"
              className="card-action-btn"
              onClick={() => {
                if (isLayoutLocked) return
                onToggleVisibility(id)
              }}
              onPointerDown={(event: any) => event.stopPropagation()}
              aria-label="Hide block"
              disabled={isLayoutLocked}
              title="Hide"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                <line x1="1" y1="1" x2="23" y2="23" />
              </svg>
            </button>
            {/* More Menu */}
            <CardMenu
              blockId={id}
              width={width}
              isLayoutLocked={isLayoutLocked}
              onSetBlockWidth={onSetBlockWidth}
              onToggleVisibility={onToggleVisibility}
            />
          </div>
        </div>

        {/* Card Body */}
        <div
          className="notion-card-body"
          style={{
            maxHeight: isCollapsed ? '0px' : '2000px',
            overflow: 'hidden',
            transition: 'max-height 0.25s ease',
          }}
        >
          <Component {...props} />
        </div>
      </div>

      {/* Resize Handles */}
      {!locked && !isLayoutLocked ? (
        <>
          <button
            type="button"
            aria-label="Resize block right"
            onMouseDown={(event: any) => {
              event.preventDefault()
              event.stopPropagation()
              onResizeStart(id, event.clientX, 'right')
            }}
            className="notion-resize-handle right"
          />
          <button
            type="button"
            aria-label="Resize block left"
            onMouseDown={(event: any) => {
              event.preventDefault()
              event.stopPropagation()
              onResizeStart(id, event.clientX, 'left')
            }}
            className="notion-resize-handle left"
          />
        </>
      ) : null}

      {/* Resize overlay + width tooltip */}
      {isResizing ? (
        <>
          <div className="pointer-events-none absolute inset-0 rounded-lg border-2 border-[var(--accent)] bg-[var(--accent-light)] opacity-40" />
          <div
            style={{
              position: 'absolute',
              top: '-28px',
              left: '50%',
              transform: 'translateX(-50%)',
              padding: '2px 8px',
              fontSize: '11px',
              fontWeight: 600,
              color: '#fff',
              background: 'var(--accent)',
              borderRadius: '4px',
              whiteSpace: 'nowrap',
              pointerEvents: 'none',
              zIndex: 30,
              animation: 'notion-menu-in 0.1s ease',
            }}
          >
            {effectiveWidth === 'auto' ? 'Auto' : effectiveWidth === 'full' ? '100%' : effectiveWidth === 'half' ? '50%' : '33%'}
          </div>
        </>
      ) : null}
    </div>
  )
}

function isBlockHidden(block: { hidden?: boolean; visible?: boolean }) {
  if (typeof block.hidden === 'boolean') return block.hidden
  if (typeof block.visible === 'boolean') return !block.visible
  return false
}

function isBlockLocked(block: { locked?: boolean }) {
  return Boolean(block?.locked)
}

function getBlockLabel(id: keyof typeof BLOCK_CATALOG) {
  return BLOCK_CATALOG[id]?.label || id
}

function Column({
  column,
  blockContext,
  onToggleVisibility,
  onSetBlockWidth,
  onKeyboardMove,
  onCancelDrag,
  onResizeStart,
  resizeState,
  isDragging,
  isActive,
  registerColumnRef,
  isLayoutLocked,
  collapsedBlocks,
  onToggleCollapse,
}: {
  column: LayoutColumn
  blockContext: BlockContext
  onToggleVisibility: (id: string) => void
  onSetBlockWidth: (id: string, width: BlockWidth) => void
  onKeyboardMove: (blockId: string, direction: 'left' | 'right') => void
  onCancelDrag: () => void
  onResizeStart: (
    blockId: string,
    startX: number,
    edge: 'left' | 'right'
  ) => void
  resizeState: ResizeState | null
  isDragging: boolean
  isActive: boolean
  registerColumnRef: (columnId: string) => (node: HTMLDivElement | null) => void
  isLayoutLocked: boolean
  collapsedBlocks: Set<string>
  onToggleCollapse: (blockId: string) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id })
  const visibleBlocks = column.blocks.filter((block) => !isBlockHidden(block))
  const items = visibleBlocks.map((block) => block.id)
  const showGuides = isDragging
  const highlight = isOver || isActive
  const setCombinedRef = (node: HTMLDivElement | null) => {
    setNodeRef(node)
    registerColumnRef(column.id)(node)
  }

  return (
    <div
      ref={setCombinedRef}
      className="relative min-h-[80px] flex-1 min-w-0 self-stretch"
    >
      {showGuides ? (
        <div
          className={`notion-drop-zone pointer-events-none absolute inset-0 transition-all duration-200 ${
            highlight ? 'active' : ''
          }`}
        />
      ) : null}
      <div className="relative z-10 flex flex-col gap-5">
        <SortableContext items={items} strategy={verticalListSortingStrategy}>
          {visibleBlocks.map((block) => (
            <SortableBlock
              key={block.id}
              id={block.id}
              blockContext={blockContext}
              locked={isBlockLocked(block)}
              onToggleVisibility={onToggleVisibility}
              width={block.width || 'auto'}
              onSetBlockWidth={onSetBlockWidth}
              onKeyboardMove={onKeyboardMove}
              onCancelDrag={onCancelDrag}
              onResizeStart={onResizeStart}
              resizeState={resizeState}
              isLayoutLocked={isLayoutLocked}
              isCollapsed={collapsedBlocks.has(block.id)}
              onToggleCollapse={onToggleCollapse}
            />
          ))}
        </SortableContext>
      </div>
    </div>
  )
}

function resolveMovePayload(
  columns: LayoutColumn[],
  activeId: string,
  overId: string
) {
  const fromColumn = findColumnByBlockId(columns, activeId)
  if (!fromColumn) return null

  const toColumn = resolveColumnForOver(columns, overId)
  if (!toColumn) return null

  const visibleBlocks = getVisibleBlocks(toColumn)
  const isColumnTarget = isColumnId(columns, overId)
  const visibleIndex = isColumnTarget
    ? visibleBlocks.length
    : findVisibleIndex(visibleBlocks, overId)
  const toIndex = mapVisibleIndexToActualIndex(
    toColumn.blocks,
    visibleIndex === null ? visibleBlocks.length : visibleIndex
  )

  return {
    blockId: activeId,
    fromColumnId: fromColumn.id,
    toColumnId: toColumn.id,
    toIndex,
  }
}

function findBlock(columns: LayoutColumn[], blockId: string) {
  for (const column of columns) {
    const block = column.blocks.find((item) => item.id === blockId)
    if (block) return block
  }
  return null
}

function findColumnByBlockId(columns: LayoutColumn[], blockId: string) {
  return columns.find((column) =>
    column.blocks.some((block) => block.id === blockId)
  )
}

function findColumn(columns: LayoutColumn[], columnId: string) {
  return columns.find((column) => column.id === columnId) || null
}

function resolveColumnForOver(columns: LayoutColumn[], overId: string) {
  return findColumn(columns, overId) || findColumnByBlockId(columns, overId)
}

function isColumnId(columns: LayoutColumn[], id: string) {
  return Boolean(findColumn(columns, id))
}

function getVisibleBlocks(column: LayoutColumn) {
  return column.blocks.filter((block) => !isBlockHidden(block))
}

function findVisibleIndex(blocks: Array<{ id: string }>, blockId: string) {
  const index = blocks.findIndex((block) => block.id === blockId)
  return index === -1 ? null : index
}

function mapVisibleIndexToActualIndex(
  blocks: Array<{ id: string; hidden?: boolean; visible?: boolean }>,
  visibleIndex: number
) {
  let visibleCounter = 0
  for (let index = 0; index < blocks.length; index += 1) {
    if (isBlockHidden(blocks[index])) continue
    if (visibleCounter === visibleIndex) return index
    visibleCounter += 1
  }
  return blocks.length
}

function getAdjacentWidth(
  width: BlockWidth,
  direction: 'left' | 'right'
) {
  const order: BlockWidth[] = ['auto', 'half', 'third', 'full']
  const index = Math.max(order.indexOf(width), 0)
  const nextIndex =
    direction === 'left'
      ? Math.max(index - 1, 0)
      : Math.min(index + 1, order.length - 1)
  return order[nextIndex]
}

function getWidthStyle(width: BlockWidth) {
  const percent = getWidthPercent(width)
  if (!percent) {
    return { width: 'auto', maxWidth: '100%' }
  }
  return { width: `${percent}%`, maxWidth: '100%' }
}

function getWidthPercent(width: BlockWidth) {
  if (width === 'full') return 100
  if (width === 'half') return 50
  if (width === 'third') return 33.3333
  return null
}

const RESIZE_WIDTH_ORDER: BlockWidth[] = ['auto', 'half', 'third', 'full']

function getResizeOrderIndex(width: BlockWidth) {
  const index = RESIZE_WIDTH_ORDER.indexOf(width)
  return index === -1 ? 0 : index
}

function clampIndex(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function GhostBlock({
  id,
  width,
}: {
  id: keyof typeof BLOCK_CATALOG
  width: BlockWidth
}) {
  const widthStyle = getWidthStyle(width)
  return (
    <div className="pointer-events-none" style={widthStyle}>
      <div
        style={{
          transform: 'scale(0.98) rotate(1deg)',
          transformOrigin: 'top left',
          transition: 'transform 0.15s ease',
        }}
      >
        <div
          className="notion-card notion-card-dragging"
          style={{ padding: '10px 14px', opacity: 0.85 }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="var(--drag-handle)">
              <circle cx="4" cy="3" r="1.2" />
              <circle cx="10" cy="3" r="1.2" />
              <circle cx="4" cy="7" r="1.2" />
              <circle cx="10" cy="7" r="1.2" />
              <circle cx="4" cy="11" r="1.2" />
              <circle cx="10" cy="11" r="1.2" />
            </svg>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text)', textTransform: 'uppercase' as const, letterSpacing: '0.04em' }}>
              {getBlockLabel(id)}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
