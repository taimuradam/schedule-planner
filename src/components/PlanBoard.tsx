import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  pointerWithin,
  rectIntersection,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type Announcements,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { useState } from 'react'
import { CATEGORIES } from '../model/categories'
import { dayOfMonth, WEEKDAY_LONG, WEEKDAY_SHORT, WEEKDAYS } from '../model/dates'
import { currentWeek, newId } from '../model/planner'
import type { CategoryId, Weekday } from '../model/types'
import { usePlanner, usePlannerDispatch } from '../state/contexts'
import { AddItemForm, CategoryTag, EditableText, Icon, IconButton } from './ui'

type DragKind = 'task' | 'backlog'

interface DragData {
  kind: DragKind
  id: string
  text: string
  category: CategoryId
  carriedOver: boolean
}

const BACKLOG_DROP = 'backlog'
const dayDropId = (day: Weekday) => `day-${day}`

function dropTargetName(id: string | number | undefined): string {
  if (id === BACKLOG_DROP) return 'the backlog'
  if (typeof id === 'string' && id.startsWith('day-')) return WEEKDAY_LONG[Number(id.slice(4))]
  return 'nowhere'
}

const announcements: Announcements = {
  onDragStart: ({ active }) => `Picked up ${(active.data.current as DragData).text}.`,
  onDragOver: ({ active, over }) =>
    over ? `${(active.data.current as DragData).text} is over ${dropTargetName(over.id)}.` : undefined,
  onDragEnd: ({ active, over }) =>
    `${(active.data.current as DragData).text} was dropped on ${dropTargetName(over?.id)}.`,
  onDragCancel: ({ active }) => `Moving ${(active.data.current as DragData).text} was cancelled.`,
}

// Pointer position decides the target for mouse and touch; keyboard drags
// have no pointer, so fall back to whichever target the item overlaps most.
const collisionDetection: CollisionDetection = (args) => {
  const hits = pointerWithin(args)
  return hits.length > 0 ? hits : rectIntersection(args)
}

export function PlanBoard() {
  const state = usePlanner()
  const dispatch = usePlannerDispatch()
  const week = currentWeek(state)
  const [dragging, setDragging] = useState<DragData | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor),
  )

  const onDragStart = ({ active }: DragStartEvent) => setDragging(active.data.current as DragData)

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    setDragging(null)
    if (!over) return
    const data = active.data.current as DragData
    const target = String(over.id)
    if (target === BACKLOG_DROP) {
      if (data.kind === 'task') dispatch({ type: 'task/unschedule', id: data.id })
      return
    }
    const day = Number(target.slice(4)) as Weekday
    if (data.kind === 'task') dispatch({ type: 'task/move', id: data.id, day })
    else dispatch({ type: 'backlog/schedule', id: data.id, day })
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      accessibility={{ announcements }}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={() => setDragging(null)}
    >
      <div className="board">
        <Backlog />
        <div className="days">
          {WEEKDAYS.map((day) => (
            <DayColumn key={day} day={day} date={dayOfMonth(week.start, day)} />
          ))}
        </div>
      </div>
      <DragOverlay dropAnimation={null}>
        {dragging && (
          <div className="card card-overlay">
            <span className="grip">
              <Icon name="grip" />
            </span>
            <CategoryTag id={dragging.category} />
            <span className="card-text">{dragging.text}</span>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  )
}

function DayColumn({ day, date }: { day: Weekday; date: number }) {
  const state = usePlanner()
  const dispatch = usePlannerDispatch()
  const tasks = currentWeek(state).tasks.filter((t) => t.day === day)
  const { setNodeRef, isOver } = useDroppable({ id: dayDropId(day) })

  return (
    <section className={`day${isOver ? ' drop-over' : ''}`} ref={setNodeRef} aria-label={WEEKDAY_LONG[day]}>
      <h3 className="day-head">
        {WEEKDAY_SHORT[day]} <span className="day-date">{date}</span>
      </h3>
      <ul className="card-list">
        {tasks.map((t) => (
          <DraggableCard
            key={t.id}
            data={{ kind: 'task', id: t.id, text: t.text, category: t.category, carriedOver: t.carriedOver }}
            fromRepeating={Boolean(t.repeatingId)}
            onText={(text) => dispatch({ type: 'task/update', id: t.id, patch: { text } })}
            onCategory={(category) => dispatch({ type: 'task/update', id: t.id, patch: { category } })}
            onRemove={() => dispatch({ type: 'task/remove', id: t.id })}
          />
        ))}
      </ul>
      <AddItemForm
        compact
        label={`Add a task on ${WEEKDAY_LONG[day]}`}
        placeholder="Add"
        onAdd={(text, category) => dispatch({ type: 'task/add', id: newId(), day, text, category })}
      />
    </section>
  )
}

function Backlog() {
  const state = usePlanner()
  const dispatch = usePlannerDispatch()
  const { setNodeRef, isOver } = useDroppable({ id: BACKLOG_DROP })

  return (
    <aside className={`backlog${isOver ? ' drop-over' : ''}`} ref={setNodeRef} aria-label="Backlog">
      <h3 className="backlog-title">Backlog</h3>
      <div className="backlog-groups">
        {CATEGORIES.map((c) => {
          const items = state.backlog.filter((b) => b.category === c.id)
          return (
            <section key={c.id} className="backlog-group">
              <h4 className="backlog-group-head">
                <CategoryTag id={c.id} /> {c.name}
                {items.length > 0 && <span className="count">{items.length}</span>}
              </h4>
              <ul className="card-list">
                {items.map((b) => (
                  <DraggableCard
                    key={b.id}
                    data={{ kind: 'backlog', id: b.id, text: b.text, category: b.category, carriedOver: b.carriedOver }}
                    onText={(text) => dispatch({ type: 'backlog/update', id: b.id, patch: { text } })}
                    onRemove={() => dispatch({ type: 'backlog/remove', id: b.id })}
                  />
                ))}
              </ul>
              <AddItemForm
                fixedCategory={c.id}
                label={`Add to ${c.name} backlog`}
                placeholder={`Add to ${c.name.toLowerCase()}`}
                onAdd={(text, category) => dispatch({ type: 'backlog/add', id: newId(), text, category })}
              />
            </section>
          )
        })}
      </div>
    </aside>
  )
}

function DraggableCard({
  data,
  fromRepeating = false,
  onText,
  onCategory,
  onRemove,
}: {
  data: DragData
  fromRepeating?: boolean
  onText: (text: string) => void
  onCategory?: (category: CategoryId) => void
  onRemove: () => void
}) {
  const { setNodeRef, setActivatorNodeRef, listeners, attributes, isDragging } = useDraggable({
    id: `${data.kind}:${data.id}`,
    data,
  })

  return (
    <li className={`card${isDragging ? ' card-dragging' : ''}`} ref={setNodeRef}>
      <button
        type="button"
        className="grip"
        ref={setActivatorNodeRef}
        {...listeners}
        {...attributes}
        aria-label={`Move ${data.text}`}
        title="Drag to another day or the backlog"
      >
        <Icon name="grip" />
      </button>
      <CategoryTag id={data.category} onChange={onCategory} />
      <EditableText className="card-text" value={data.text} onSave={onText} />
      {data.carriedOver && (
        <span className="card-flag" title="Carried over from an earlier week" aria-label="Carried over">
          <Icon name="carried" size={13} />
        </span>
      )}
      {fromRepeating && (
        <span className="card-flag" title="Repeats every week" aria-label="Repeats every week">
          <Icon name="repeat" size={13} />
        </span>
      )}
      <IconButton icon="x" label={`Remove ${data.text}`} className="card-remove" onClick={onRemove} />
    </li>
  )
}
