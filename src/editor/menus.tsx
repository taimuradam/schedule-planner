import { formatDays, WEEKDAY_LETTER, WEEKDAY_LONG, WEEKDAY_SHORT, WEEKDAYS } from '../model/dates'
import { currentWeek, groupOf, newId } from '../model/planner'
import type { BacklogItem, DailyTask, DayTask, Goal, Weekday } from '../model/types'
import { usePlanner, usePlannerDispatch } from '../state/contexts'
import { useEditor } from './editorContext'
import { Menu, MenuCategories, MenuDivider, MenuItem, MenuLabel } from './Menu'

interface MenuProps<T> {
  item: T
  anchor: HTMLElement
  onClose: () => void
  onRename: () => void
}

/** Wraps a menu action so the menu closes once it's done. */
function closeAfter(onClose: () => void) {
  return (fn: () => void) => () => {
    fn()
    onClose()
  }
}

function DayButtons({ onDay }: { onDay: (day: Weekday) => void }) {
  return (
    <div className="menu-days">
      {WEEKDAYS.map((d) => (
        <button
          key={d}
          type="button"
          role="menuitem"
          className="menu-day"
          aria-label={`Put on ${WEEKDAY_LONG[d]}`}
          onClick={() => onDay(d)}
        >
          {WEEKDAY_SHORT[d]}
        </button>
      ))}
    </div>
  )
}

/** One toggle per weekday, ticked for each day the task is on. */
function DayToggles({
  days,
  locked,
  onToggle,
}: {
  days: Set<Weekday>
  locked?: Weekday
  onToggle: (day: Weekday) => void
}) {
  return (
    <div className="menu-toggles">
      {WEEKDAYS.map((d) => (
        <button
          key={d}
          type="button"
          role="menuitemcheckbox"
          aria-checked={days.has(d)}
          aria-label={WEEKDAY_LONG[d]}
          title={d === locked ? 'Its only day. Use Delete to remove it.' : WEEKDAY_LONG[d]}
          className="menu-toggle"
          disabled={d === locked}
          onClick={() => onToggle(d)}
        >
          {WEEKDAY_LETTER[d]}
        </button>
      ))}
    </div>
  )
}

export function TaskMenu({ item: task, anchor, onClose, onRename }: MenuProps<DayTask>) {
  const state = usePlanner()
  const dispatch = usePlannerDispatch()
  const editor = useEditor()
  const then = closeAfter(onClose)
  const group = groupOf(currentWeek(state), task)
  const days = new Set(group.map((t) => t.day))
  const thisWeek = task.repeatingId ? ' this week' : ''

  // Stays open, so you can tick several days in a row.
  const toggleDay = (day: Weekday) => {
    const copy = group.find((t) => t.day === day)
    if (copy) dispatch({ type: 'task/removeDay', id: copy.id })
    else dispatch({ type: 'task/addDay', id: task.id, day, newId: newId() })
  }

  return (
    <Menu anchor={anchor} label={`Options for ${task.text}`} onClose={onClose}>
      <MenuCategories
        value={task.category}
        onChange={(category) => then(() => dispatch({ type: 'task/update', id: task.id, patch: { category } }))()}
      />
      <MenuDivider />
      <MenuItem icon="pencil" onSelect={then(onRename)}>
        Rename
      </MenuItem>
      {task.repeatingId ? (
        <MenuItem icon="repeat" onSelect={then(() => dispatch({ type: 'task/stopRepeat', id: task.id }))}>
          Stop repeating
        </MenuItem>
      ) : (
        <MenuItem
          icon="repeat"
          onSelect={then(() => dispatch({ type: 'task/repeat', id: task.id, repeatingId: newId() }))}
        >
          Repeat every {formatDays([...days])}
        </MenuItem>
      )}
      <MenuDivider />
      <MenuLabel>{task.repeatingId ? 'On these days, every week' : 'On these days'}</MenuLabel>
      <DayToggles days={days} locked={days.size === 1 ? task.day : undefined} onToggle={toggleDay} />
      <MenuItem icon="inbox" onSelect={then(() => dispatch({ type: 'task/unschedule', id: task.id }))}>
        Back to backlog
      </MenuItem>
      <MenuDivider />
      {group.length > 1 && (
        <MenuItem
          icon="trash"
          danger
          onSelect={then(() => {
            dispatch({ type: 'task/remove', id: task.id })
            editor.notify(`Deleted “${task.text}” from ${WEEKDAY_LONG[task.day]}.`, state)
          })}
        >
          Delete from {WEEKDAY_LONG[task.day]}
          {thisWeek}
        </MenuItem>
      )}
      <MenuItem
        icon="trash"
        danger
        onSelect={then(() => {
          dispatch({ type: 'task/removeGroup', id: task.id })
          editor.notify(`Deleted “${task.text}”.`, state)
        })}
      >
        {group.length > 1 ? `Delete from all ${group.length} days` : 'Delete'}
        {thisWeek}
      </MenuItem>
    </Menu>
  )
}

export function BacklogMenu({ item, anchor, onClose, onRename }: MenuProps<BacklogItem>) {
  const state = usePlanner()
  const dispatch = usePlannerDispatch()
  const editor = useEditor()
  const then = closeAfter(onClose)

  return (
    <Menu anchor={anchor} label={`Options for ${item.text}`} onClose={onClose}>
      <MenuCategories
        value={item.category}
        onChange={(category) => then(() => dispatch({ type: 'backlog/update', id: item.id, patch: { category } }))()}
      />
      <MenuDivider />
      <MenuItem icon="pencil" onSelect={then(onRename)}>
        Rename
      </MenuItem>
      <MenuLabel>Put on</MenuLabel>
      <DayButtons onDay={(day) => then(() => dispatch({ type: 'backlog/schedule', id: item.id, day }))()} />
      <MenuDivider />
      <MenuItem
        icon="trash"
        danger
        onSelect={then(() => {
          dispatch({ type: 'backlog/remove', id: item.id })
          editor.notify(`Deleted “${item.text}”.`, state)
        })}
      >
        Delete
      </MenuItem>
    </Menu>
  )
}

export function GoalMenu({ item: goal, anchor, onClose, onRename }: MenuProps<Goal>) {
  const state = usePlanner()
  const dispatch = usePlannerDispatch()
  const editor = useEditor()
  const then = closeAfter(onClose)

  return (
    <Menu anchor={anchor} label={`Options for ${goal.text}`} onClose={onClose}>
      <MenuCategories
        value={goal.category}
        onChange={(category) => then(() => dispatch({ type: 'goal/update', id: goal.id, patch: { category } }))()}
      />
      <MenuDivider />
      <MenuItem icon="pencil" onSelect={then(onRename)}>
        Rename
      </MenuItem>
      <MenuItem
        icon="trash"
        danger
        onSelect={then(() => {
          dispatch({ type: 'goal/remove', id: goal.id })
          editor.notify(`Deleted “${goal.text}”.`, state)
        })}
      >
        Delete
      </MenuItem>
    </Menu>
  )
}

export function DailyMenu({ item: task, anchor, onClose, onRename }: MenuProps<DailyTask>) {
  const state = usePlanner()
  const dispatch = usePlannerDispatch()
  const editor = useEditor()
  const then = closeAfter(onClose)

  return (
    <Menu anchor={anchor} label={`Options for ${task.text}`} onClose={onClose}>
      <MenuCategories
        value={task.category}
        onChange={(category) => then(() => dispatch({ type: 'daily/update', id: task.id, patch: { category } }))()}
      />
      <MenuDivider />
      <MenuItem icon="pencil" onSelect={then(onRename)}>
        Rename
      </MenuItem>
      <MenuItem
        icon={task.active ? 'eyeOff' : 'eye'}
        onSelect={then(() => dispatch({ type: 'daily/update', id: task.id, patch: { active: !task.active } }))}
      >
        {task.active ? 'Leave off the page' : 'Put back on the page'}
      </MenuItem>
      <MenuItem
        icon="trash"
        danger
        onSelect={then(() => {
          dispatch({ type: 'daily/remove', id: task.id })
          editor.notify(`Deleted “${task.text}”.`, state)
        })}
      >
        Delete
      </MenuItem>
    </Menu>
  )
}
