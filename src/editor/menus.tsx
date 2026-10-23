import { WEEKDAY_LONG, WEEKDAY_SHORT, WEEKDAYS } from '../model/dates'
import { newId } from '../model/planner'
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

function MoveTargets({
  current,
  onDay,
  onBacklog,
}: {
  current?: Weekday
  onDay: (day: Weekday) => void
  onBacklog?: () => void
}) {
  return (
    <div className="menu-days">
      {WEEKDAYS.map((d) => (
        <button
          key={d}
          type="button"
          role="menuitem"
          className="menu-day"
          disabled={d === current}
          aria-label={`Move to ${WEEKDAY_LONG[d]}`}
          onClick={() => onDay(d)}
        >
          {WEEKDAY_SHORT[d]}
        </button>
      ))}
      {onBacklog && (
        <button type="button" role="menuitem" className="menu-day menu-day-wide" onClick={onBacklog}>
          Backlog
        </button>
      )}
    </div>
  )
}

export function TaskMenu({ item: task, anchor, onClose, onRename }: MenuProps<DayTask>) {
  const state = usePlanner()
  const dispatch = usePlannerDispatch()
  const editor = useEditor()
  const then = closeAfter(onClose)

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
          Repeat every {WEEKDAY_LONG[task.day]}
        </MenuItem>
      )}
      <MenuDivider />
      <MenuLabel>Move to</MenuLabel>
      <MoveTargets
        current={task.day}
        onDay={(day) => then(() => dispatch({ type: 'task/move', id: task.id, day }))()}
        onBacklog={then(() => dispatch({ type: 'task/unschedule', id: task.id }))}
      />
      <MenuDivider />
      <MenuItem
        icon="trash"
        danger
        onSelect={then(() => {
          dispatch({ type: 'task/remove', id: task.id })
          editor.notify(`Deleted “${task.text}”.`, state)
        })}
      >
        {task.repeatingId ? 'Delete from this week' : 'Delete'}
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
      <MoveTargets onDay={(day) => then(() => dispatch({ type: 'backlog/schedule', id: item.id, day }))()} />
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
