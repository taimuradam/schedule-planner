// The on-screen editing layer of the sheet: lines you click to write on,
// the "⋯" menus, and dragging. None of this is rendered in the printout.

import { useDraggable, useDroppable } from '@dnd-kit/core'
import { useContext, useState } from 'react'
import { Icon } from '../components/ui'
import { LineEditor } from '../editor/LineEditor'
import { MoreButton } from '../editor/Menu'
import { DailyMenu, FocusMenu, GoalMenu, TaskMenu } from '../editor/menus'
import { formatDays, monthName, previousMonth, WEEKDAY_LONG } from '../model/dates'
import { FOCUS_LIMIT, currentWeek, goalsForMonth, newId } from '../model/planner'
import type { CategoryId, DailyTask, DayTask, FocusItem, Goal, Weekday } from '../model/types'
import { usePlanner, usePlannerDispatch } from '../state/contexts'
import { blanks, BLANK_DAY_LINES, dayDropId, DropSpotContext, slotDropId, useLine, type DragData } from './lines'
import { Box, BoxCells, DayHead, DueTag, Tag } from './parts'

/** Writes the line only if something actually changed. */
function changed(item: { text: string; category: CategoryId }, text: string, category: CategoryId) {
  return item.text !== text || item.category !== category
}

export function SectionAddButton({
  label,
  onClick,
  fill = false,
}: {
  label: string
  onClick: () => void
  fill?: boolean
}) {
  return (
    <button type="button" className={fill ? 'line-button' : 'section-add'} onClick={onClick}>
      {fill ? (
        <span className="line-hint">{label}</span>
      ) : (
        <>
          <Icon name="plus" size={12} /> Add
        </>
      )}
    </button>
  )
}

export function CopyGoalsButton({ month }: { month: string }) {
  const state = usePlanner()
  const dispatch = usePlannerDispatch()
  const last = previousMonth(month)
  if (goalsForMonth(state, last).length === 0) return null
  return (
    <button
      type="button"
      className="section-add"
      onClick={() => dispatch({ type: 'goal/copyMonth', from: last, to: month })}
    >
      Copy {monthName(last)}'s goals
    </button>
  )
}

export function EditableGoal({ goal }: { goal: Goal }) {
  const dispatch = usePlannerDispatch()
  const line = useLine()

  if (line.renaming) {
    return (
      <li className="sheet-row is-writing">
        <LineEditor
          initialText={goal.text}
          initialCategory={goal.category}
          label="Edit goal"
          placeholder="Goal"
          onSubmit={(text, category) => {
            if (changed(goal, text, category)) dispatch({ type: 'goal/update', id: goal.id, patch: { text, category } })
          }}
          onClose={line.stopRename}
        />
      </li>
    )
  }

  return (
    <>
      <li className="sheet-row is-editable" onContextMenu={line.onContextMenu}>
        <Tag id={goal.category} />
        <button type="button" className="line-text" onClick={line.startRename}>
          {goal.text}
        </button>
        <MoreButton label={`Options for ${goal.text}`} open={Boolean(line.menuAnchor)} onOpen={line.openMenu} />
      </li>
      {line.menuAnchor && (
        <GoalMenu item={goal} anchor={line.menuAnchor} onClose={line.closeMenu} onRename={line.startRename} />
      )}
    </>
  )
}

export function AddGoalLine({ month, onClose }: { month: string; onClose: () => void }) {
  const dispatch = usePlannerDispatch()
  return (
    <li className="sheet-row is-writing">
      <LineEditor
        repeat
        label={`New ${monthName(month)} goal`}
        placeholder="Land 5 first-round interviews"
        onSubmit={(text, category) => dispatch({ type: 'goal/add', id: newId(), month, text, category })}
        onClose={onClose}
      />
    </li>
  )
}

export function EditableFocus({ item }: { item: FocusItem }) {
  const dispatch = usePlannerDispatch()
  const line = useLine()

  if (line.renaming) {
    return (
      <li className="sheet-row is-writing">
        <LineEditor
          initialText={item.text}
          initialCategory={item.category}
          label="Edit priority"
          placeholder="Priority"
          onSubmit={(text, category) => {
            if (changed(item, text, category))
              dispatch({ type: 'focus/update', id: item.id, patch: { text, category } })
          }}
          onClose={line.stopRename}
        />
      </li>
    )
  }

  return (
    <>
      <li className="sheet-row is-editable" onContextMenu={line.onContextMenu}>
        <Box />
        <button type="button" className="line-text" onClick={line.startRename}>
          {item.text}
        </button>
        <Tag id={item.category} />
        <MoreButton label={`Options for ${item.text}`} open={Boolean(line.menuAnchor)} onOpen={line.openMenu} />
      </li>
      {line.menuAnchor && (
        <FocusMenu item={item} anchor={line.menuAnchor} onClose={line.closeMenu} onRename={line.startRename} />
      )}
    </>
  )
}

export function AddFocusLine({ onClose }: { onClose: () => void }) {
  const state = usePlanner()
  const dispatch = usePlannerDispatch()
  // Stops offering another line once the third priority is in.
  const room = FOCUS_LIMIT - currentWeek(state).focus.length
  return (
    <li className="sheet-row is-writing">
      <LineEditor
        repeat={room > 1}
        label="New priority for this week"
        placeholder="Finish problem set 5"
        onSubmit={(text, category) => dispatch({ type: 'focus/add', id: newId(), text, category })}
        onClose={onClose}
      />
    </li>
  )
}

export function EditableDailyRow({ task }: { task: DailyTask }) {
  const dispatch = usePlannerDispatch()
  const line = useLine()

  if (line.renaming) {
    return (
      <tr className="is-writing">
        <th scope="row">
          <LineEditor
            initialText={task.text}
            initialCategory={task.category}
            label="Edit daily task"
            placeholder="Daily task"
            onSubmit={(text, category) => {
              if (changed(task, text, category))
                dispatch({ type: 'daily/update', id: task.id, patch: { text, category } })
            }}
            onClose={line.stopRename}
          />
        </th>
        <BoxCells days={task.days} />
      </tr>
    )
  }

  return (
    <>
      <tr className={`is-editable${task.active ? '' : ' is-hidden'}`} onContextMenu={line.onContextMenu}>
        <th scope="row">
          <span className="sheet-daily-label">
            <Tag id={task.category} />
            <button type="button" className="line-text" onClick={line.startRename}>
              {task.text}
            </button>
            {!task.active && <span className="hidden-note">not printed</span>}
            <MoreButton label={`Options for ${task.text}`} open={Boolean(line.menuAnchor)} onOpen={line.openMenu} />
          </span>
        </th>
        <BoxCells days={task.days} />
      </tr>
      {line.menuAnchor && (
        <DailyMenu item={task} anchor={line.menuAnchor} onClose={line.closeMenu} onRename={line.startRename} />
      )}
    </>
  )
}

export function AddDailyRow({ onClose }: { onClose: () => void }) {
  const dispatch = usePlannerDispatch()
  return (
    <tr className="is-writing">
      <th scope="row">
        <LineEditor
          repeat
          label="New daily task"
          placeholder="1 LeetCode problem"
          onSubmit={(text, category) => dispatch({ type: 'daily/add', id: newId(), text, category })}
          onClose={onClose}
        />
      </th>
      <BoxCells />
    </tr>
  )
}

export function EditableDay({ day, date, tasks }: { day: Weekday; date: number; tasks: DayTask[] }) {
  const dispatch = usePlannerDispatch()
  const { setNodeRef, isOver } = useDroppable({ id: dayDropId(day) })
  const [adding, setAdding] = useState(false)

  return (
    <div className={`sheet-day${isOver ? ' is-drop-target' : ''}`} ref={setNodeRef}>
      <DayHead day={day} date={date} />
      <ul className="sheet-task-list">
        {tasks.map((t) => (
          <EditableTask key={t.id} task={t} />
        ))}
        {adding && (
          <li className="sheet-task is-writing">
            <LineEditor
              repeat
              chips="below"
              label={`New task on ${WEEKDAY_LONG[day]}`}
              placeholder="New task"
              onSubmit={(text, category) => dispatch({ type: 'task/add', id: newId(), day, text, category })}
              onClose={() => setAdding(false)}
            />
          </li>
        )}
      </ul>
      {/* Clicking anywhere in the empty lines starts a new task at the bottom of the list. */}
      <div className="sheet-lines" onClick={() => setAdding(true)}>
        {!adding && (
          <button type="button" className="sheet-line line-button" aria-label={`Add a task on ${WEEKDAY_LONG[day]}`}>
            <span className="line-hint">Add</span>
          </button>
        )}
        {blanks(BLANK_DAY_LINES).map((i) => (
          <div key={i} className="sheet-line" aria-hidden="true" />
        ))}
      </div>
    </div>
  )
}

function EditableTask({ task }: { task: DayTask }) {
  const state = usePlanner()
  const dispatch = usePlannerDispatch()
  const repeatDays = state.repeating.find((r) => r.id === task.repeatingId)?.weekdays ?? [task.day]
  const line = useLine()
  // The whole row drags (after a few pixels of movement), so a plain click
  // on the text still means "edit".
  const { setNodeRef, listeners, isDragging } = useDraggable({
    id: `task:${task.id}`,
    data: { kind: 'task', id: task.id, text: task.text, category: task.category } satisfies DragData,
    disabled: line.renaming,
  })
  const { setNodeRef: setDropRef } = useDroppable({ id: slotDropId(task.id) })
  const spot = useContext(DropSpotContext)
  const dropClass = spot?.taskId === task.id ? (spot.before ? ' drop-before' : ' drop-after') : ''

  if (line.renaming) {
    return (
      <li className="sheet-task is-writing">
        <LineEditor
          chips="below"
          initialText={task.text}
          initialCategory={task.category}
          label="Edit task"
          placeholder="Task"
          onSubmit={(text, category) => {
            if (changed(task, text, category)) dispatch({ type: 'task/update', id: task.id, patch: { text, category } })
          }}
          onClose={line.stopRename}
        />
      </li>
    )
  }

  // The menu sits outside the row: it's portalled, but React events from it
  // would still bubble into the row's drag listeners.
  return (
    <>
      <li
        ref={(el) => {
          setNodeRef(el)
          setDropRef(el)
        }}
        className={`sheet-task is-editable${isDragging ? ' is-dragging' : ''}${dropClass}`}
        onContextMenu={line.onContextMenu}
        {...listeners}
      >
        <span className="drag-box" title="Drag to move it, here or to another day">
          <Box />
          <Icon name="grip" size={12} />
        </span>
        <button type="button" className="sheet-task-text line-text" onClick={line.startRename}>
          {task.text}
          <DueTag due={task.due} day={task.day} />
          {task.repeatingId && (
            <span className="repeat-mark" title={`Repeats every ${formatDays(repeatDays)}`}>
              <Icon name="repeat" size={11} />
            </span>
          )}
        </button>
        <Tag id={task.category} />
        <MoreButton label={`Options for ${task.text}`} open={Boolean(line.menuAnchor)} onOpen={line.openMenu} />
      </li>
      {line.menuAnchor && (
        <TaskMenu item={task} anchor={line.menuAnchor} onClose={line.closeMenu} onRename={line.startRename} />
      )}
    </>
  )
}
