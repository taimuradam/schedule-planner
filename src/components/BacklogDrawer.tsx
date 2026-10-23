import { useDraggable, useDroppable } from '@dnd-kit/core'
import { LineEditor } from '../editor/LineEditor'
import { MoreButton } from '../editor/Menu'
import { BacklogMenu } from '../editor/menus'
import { CATEGORIES } from '../model/categories'
import { newId } from '../model/planner'
import type { BacklogItem } from '../model/types'
import { useLine, type DragData } from '../sheet/lines'
import { usePlanner, usePlannerDispatch } from '../state/contexts'
import { CategoryTag, Icon, IconButton } from './ui'

export const BACKLOG_DROP = 'backlog'

/** Tasks without a day yet. Slides in beside the page so you can drag from it. */
export function BacklogDrawer({ onClose }: { onClose: () => void }) {
  const state = usePlanner()
  const dispatch = usePlannerDispatch()
  const { setNodeRef, isOver } = useDroppable({ id: BACKLOG_DROP })

  return (
    <aside
      className={`drawer${isOver ? ' is-drop-target' : ''}`}
      ref={setNodeRef}
      aria-label="Backlog"
      onKeyDown={(e) => {
        if (e.key === 'Escape' && !e.defaultPrevented) onClose()
      }}
    >
      <header className="drawer-head">
        <h2 className="drawer-title">Backlog</h2>
        <IconButton icon="x" label="Close backlog" onClick={onClose} />
      </header>
      <p className="drawer-hint">Drag onto a day. Anything you don't finish lands back here.</p>
      <div className="drawer-add">
        <LineEditor
          persistent
          label="Add to backlog"
          placeholder="Add to backlog"
          onSubmit={(text, category) => dispatch({ type: 'backlog/add', id: newId(), text, category })}
        />
      </div>
      <div className="drawer-groups">
        {CATEGORIES.map((c) => {
          const items = state.backlog.filter((b) => b.category === c.id)
          return (
            <section key={c.id} className="drawer-group">
              <h3 className="drawer-group-head">
                <CategoryTag id={c.id} /> {c.name}
                <span className="count">{items.length || ''}</span>
              </h3>
              {items.length === 0 ? (
                <p className="drawer-empty">Nothing waiting.</p>
              ) : (
                <ul className="drawer-list">
                  {items.map((b) => (
                    <BacklogLine key={b.id} item={b} />
                  ))}
                </ul>
              )}
            </section>
          )
        })}
      </div>
    </aside>
  )
}

function BacklogLine({ item }: { item: BacklogItem }) {
  const dispatch = usePlannerDispatch()
  const line = useLine()
  const { setNodeRef, listeners, isDragging } = useDraggable({
    id: `backlog:${item.id}`,
    data: { kind: 'backlog', id: item.id, text: item.text, category: item.category } satisfies DragData,
    disabled: line.renaming,
  })

  if (line.renaming) {
    return (
      <li className="drawer-item is-writing">
        <LineEditor
          initialText={item.text}
          initialCategory={item.category}
          label="Edit backlog item"
          placeholder="Task"
          onSubmit={(text, category) => {
            if (text !== item.text || category !== item.category)
              dispatch({ type: 'backlog/update', id: item.id, patch: { text, category } })
          }}
          onClose={line.stopRename}
        />
      </li>
    )
  }

  return (
    <>
      <li
        ref={setNodeRef}
        className={`drawer-item is-editable${isDragging ? ' is-dragging' : ''}`}
        onContextMenu={line.onContextMenu}
        {...listeners}
      >
        <span className="drawer-grip" aria-hidden="true">
          <Icon name="grip" size={12} />
        </span>
        <button type="button" className="line-text" onClick={line.startRename}>
          {item.text}
        </button>
        {item.carriedOver && (
          <span className="carried-mark" title="Not finished last week">
            <Icon name="carried" size={13} />
          </span>
        )}
        <MoreButton label={`Options for ${item.text}`} open={Boolean(line.menuAnchor)} onOpen={line.openMenu} />
      </li>
      {line.menuAnchor && (
        <BacklogMenu item={item} anchor={line.menuAnchor} onClose={line.closeMenu} onRename={line.startRename} />
      )}
    </>
  )
}
