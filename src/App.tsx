import {
  DndContext,
  DragOverlay,
  PointerSensor,
  pointerWithin,
  useSensor,
  useSensors,
  type Announcements,
  type CollisionDetection,
  type DragEndEvent,
  type DragMoveEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { BACKLOG_DROP, BacklogDrawer } from './components/BacklogDrawer'
import { PastWeeks } from './components/PastWeeks'
import { PlanningSteps } from './components/PlanningSteps'
import { stepFocus, type Step } from './components/steps'
import { CategoryTag, Icon, IconButton } from './components/ui'
import { EditorContext, type Editor } from './editor/editorContext'
import { buildGuesser, examplesFrom } from './editor/guessCategory'
import { Menu, MenuItem, MenuLabel } from './editor/Menu'
import { formatSince, formatWeekRange, goalMonthOf, planningWeekStart, toISODate, WEEKDAY_LONG } from './model/dates'
import { currentGoals, currentWeek, newId } from './model/planner'
import { downloadFile, readBackup } from './model/storage'
import type { CategoryId, PlannerState, Weekday } from './model/types'
import { DropSpotContext, type DragData, type DropSpot } from './sheet/lines'
import { PageEditor } from './sheet/PageEditor'
import type { SheetData } from './sheet/Sheet'
import { usePlanner, usePlannerDispatch, useStorageStatus } from './state/contexts'
import { useSaveBackup } from './state/useSaveBackup'

type Flash = { text: string; undo?: PlannerState; tone?: 'warning' }

function dropTargetName(id: string | number | undefined): string {
  if (id === BACKLOG_DROP) return 'the backlog'
  if (typeof id === 'string' && id.startsWith('day-')) return WEEKDAY_LONG[Number(id.slice(4))]
  if (typeof id === 'string' && id.startsWith('slot:')) return 'a spot in the list'
  return 'nowhere'
}

// A pointer over a task row is aiming at that spot in the list; anywhere
// else in a day column means "this day", and the task joins its category.
const collisionDetection: CollisionDetection = (args) => {
  const hits = pointerWithin(args)
  const slots = hits.filter((h) => String(h.id).startsWith('slot:'))
  return slots.length > 0 ? slots : hits
}

/** Which half of the hovered row the pointer is in: drop before it or after it. */
function dropSpotOf({ over, activatorEvent, delta }: DragMoveEvent): DropSpot | null {
  if (!over || !String(over.id).startsWith('slot:')) return null
  const y = (activatorEvent as PointerEvent).clientY + delta.y
  return { taskId: String(over.id).slice(5), before: y < over.rect.top + over.rect.height / 2 }
}

const announcements: Announcements = {
  onDragStart: ({ active }) => `Picked up ${(active.data.current as DragData).text}.`,
  onDragOver: ({ active, over }) =>
    over ? `${(active.data.current as DragData).text} is over ${dropTargetName(over.id)}.` : undefined,
  onDragEnd: ({ active, over }) =>
    `${(active.data.current as DragData).text} was dropped on ${dropTargetName(over?.id)}.`,
  onDragCancel: ({ active }) => `Moving ${(active.data.current as DragData).text} was cancelled.`,
}

export default function App() {
  const state = usePlanner()
  const dispatch = usePlannerDispatch()
  const { saveFailed, unreadable } = useStorageStatus()
  const saveBackup = useSaveBackup()
  const week = currentWeek(state)
  const [today] = useState(() => new Date())
  const [step, setStep] = useState<Step | null>(null)
  const [backlogOpen, setBacklogOpen] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [flash, setFlash] = useState<Flash | null>(null)
  const [lastCategory, setLastCategory] = useState<CategoryId>('job')
  const [dragging, setDragging] = useState<DragData | null>(null)
  const [dropSpot, setDropSpot] = useState<DropSpot | null>(null)
  // Holding Option (Alt) while dropping a day's task copies it instead of moving it.
  const [copying, setCopying] = useState(false)
  const copyingRef = useRef(false)
  const [moreAnchor, setMoreAnchor] = useState<HTMLElement | null>(null)
  const [hidden, setHidden] = useState<ReadonlySet<'unreadable' | 'backup'>>(new Set())
  const hide = (notice: 'unreadable' | 'backup') => setHidden((prev) => new Set(prev).add(notice))
  const fileRef = useRef<HTMLInputElement>(null)

  const weekIsOver = planningWeekStart(today) > week.start
  const isEmpty =
    state.goals.length === 0 && state.dailyTasks.length === 0 && state.backlog.length === 0 && week.tasks.length === 0
  const backupAge = state.lastBackupAt ? (today.getTime() - new Date(state.lastBackupAt).getTime()) / 86_400_000 : null
  const backupOverdue = !isEmpty && (backupAge === null || backupAge > 14)

  // Pointer only: drags start after a few pixels so clicks still edit. Keyboard
  // users change a task's days from the toggles in its menu instead.
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  // Relearns from everything you've filed whenever the planner changes.
  const guess = useMemo(() => buildGuesser(examplesFrom(state)), [state])
  const editor = useMemo<Editor>(
    () => ({ lastCategory, setLastCategory, guess, notify: (text, undo) => setFlash({ text, undo }) }),
    [lastCategory, guess],
  )

  const sheet = useMemo<SheetData>(() => {
    const { start, tasks } = currentWeek(state)
    return {
      weekStart: start,
      today: toISODate(today),
      goalMonth: goalMonthOf(start),
      goals: currentGoals(state),
      dailyTasks: state.dailyTasks,
      tasks,
    }
  }, [state, today])

  const goToStep = (next: Step) => {
    setHistoryOpen(false)
    setStep(next)
    if (next === 'days') setBacklogOpen(true)
  }

  const trackCopying = (altKey: boolean) => {
    copyingRef.current = altKey
    setCopying(altKey)
  }

  // Option can be pressed or released mid-drag, so keep watching it.
  useEffect(() => {
    if (!dragging) return
    const onEvent = (e: KeyboardEvent | PointerEvent) => trackCopying(e.altKey)
    window.addEventListener('keydown', onEvent)
    window.addEventListener('keyup', onEvent)
    window.addEventListener('pointermove', onEvent)
    return () => {
      window.removeEventListener('keydown', onEvent)
      window.removeEventListener('keyup', onEvent)
      window.removeEventListener('pointermove', onEvent)
    }
  }, [dragging])

  const onDragStart = ({ active, activatorEvent }: DragStartEvent) => {
    setDragging(active.data.current as DragData)
    trackCopying((activatorEvent as PointerEvent).altKey)
  }

  const onDragMove = (event: DragMoveEvent) => {
    const spot = dropSpotOf(event)
    setDropSpot((prev) => (prev?.taskId === spot?.taskId && prev?.before === spot?.before ? prev : spot))
  }

  const endDrag = () => {
    setDragging(null)
    setDropSpot(null)
    trackCopying(false)
  }

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    const copy = copyingRef.current
    const spot = dropSpotOf(event)
    endDrag()
    if (!over) return
    const data = active.data.current as DragData

    if (spot) {
      // Dropped at an exact spot, which it keeps from now on.
      const week = currentWeek(state)
      const target = week.tasks.find((t) => t.id === spot.taskId)
      if (!target || target.id === data.id) return
      const dayTasks = week.tasks.filter((t) => t.day === target.day)
      const beforeId = spot.before ? target.id : (dayTasks[dayTasks.indexOf(target) + 1]?.id ?? null)
      if (data.kind === 'backlog') dispatch({ type: 'backlog/schedule', id: data.id, day: target.day, beforeId })
      else if (copy) dispatch({ type: 'task/addDay', id: data.id, day: target.day, newId: newId() })
      else dispatch({ type: 'task/place', id: data.id, day: target.day, beforeId })
      return
    }

    const target = String(over.id)
    if (target === BACKLOG_DROP) {
      if (data.kind === 'task') dispatch({ type: 'task/unschedule', id: data.id })
      return
    }
    const day = Number(target.slice(4)) as Weekday
    if (data.kind === 'backlog') dispatch({ type: 'backlog/schedule', id: data.id, day })
    else if (copy) dispatch({ type: 'task/addDay', id: data.id, day, newId: newId() })
    else dispatch({ type: 'task/move', id: data.id, day })
  }

  const importBackup = async (file: File) => {
    const restored = await readBackup(file)
    if (!restored) {
      setFlash({ text: "That file isn't a planner backup, so nothing changed.", tone: 'warning' })
      return
    }
    if (!window.confirm('Replace everything in the planner with this backup?')) return
    dispatch({ type: 'state/replace', state: restored })
    setFlash({ text: `Backup restored. You're on the week of ${formatWeekRange(restored.currentWeek)}.`, undo: state })
  }

  return (
    <EditorContext value={editor}>
      <DndContext
        sensors={sensors}
        collisionDetection={collisionDetection}
        accessibility={{ announcements }}
        onDragStart={onDragStart}
        onDragMove={onDragMove}
        onDragEnd={onDragEnd}
        onDragCancel={endDrag}
      >
        <DropSpotContext value={dropSpot}>
          <div className={`app${backlogOpen ? ' has-drawer' : ''}`}>
            <header className="topbar">
              {/* The week itself is the page's own heading, just below. */}
              <h1 className="app-title">Weekly planner</h1>
              <div className="topbar-actions">
                {!step && (
                  <button type="button" className="button" onClick={() => goToStep(weekIsOver ? 'wrapup' : 'goals')}>
                    {weekIsOver ? 'Plan next week' : 'Plan the week'}
                  </button>
                )}
                <button
                  type="button"
                  className={`button${historyOpen ? ' is-active' : ''}`}
                  aria-pressed={historyOpen}
                  onClick={() => {
                    setStep(null)
                    setHistoryOpen((open) => !open)
                  }}
                >
                  <Icon name="history" /> Past weeks
                </button>
                <button
                  type="button"
                  className={`button${backlogOpen ? ' is-active' : ''}`}
                  aria-pressed={backlogOpen}
                  onClick={() => setBacklogOpen((open) => !open)}
                >
                  Backlog
                  {state.backlog.length > 0 && <span className="badge">{state.backlog.length}</span>}
                </button>
                <button type="button" className="button button-primary" onClick={() => window.print()}>
                  <Icon name="printer" /> Print
                </button>
                <IconButton icon="more" label="More options" onClick={(e) => setMoreAnchor(e.currentTarget)} />
                {moreAnchor && (
                  <Menu anchor={moreAnchor} label="More options" onClose={() => setMoreAnchor(null)}>
                    <MenuLabel>
                      {state.lastBackupAt
                        ? `Last backup ${formatSince(state.lastBackupAt, today)}`
                        : 'Not backed up yet'}
                    </MenuLabel>
                    <MenuItem
                      icon="download"
                      onSelect={() => {
                        saveBackup()
                        setMoreAnchor(null)
                      }}
                    >
                      Export backup
                    </MenuItem>
                    <MenuItem
                      icon="upload"
                      onSelect={() => {
                        setMoreAnchor(null)
                        fileRef.current?.click()
                      }}
                    >
                      Import backup
                    </MenuItem>
                  </Menu>
                )}
                <input
                  ref={fileRef}
                  type="file"
                  accept="application/json,.json"
                  hidden
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    e.target.value = ''
                    if (file) void importBackup(file)
                  }}
                />
              </div>
            </header>

            {step && (
              <PlanningSteps
                step={step}
                onStep={goToStep}
                onClose={() => setStep(null)}
                onPrint={() => window.print()}
              />
            )}

            <div className="notices">
              {unreadable && !hidden.has('unreadable') && (
                <Notice tone="warning" onDismiss={() => hide('unreadable')}>
                  Some saved planner data couldn't be read, so the planner started fresh. The old data is kept, not
                  deleted.
                  <button
                    type="button"
                    className="button button-small"
                    onClick={() => downloadFile(`weekly-planner-unreadable-${week.start}.json`, unreadable)}
                  >
                    Download the old data
                  </button>
                </Notice>
              )}
              {saveFailed && (
                <Notice tone="warning">
                  This browser isn't letting the planner save. Export a backup so you don't lose your changes.
                </Notice>
              )}
              {flash && (
                <Notice tone={flash.tone} onDismiss={() => setFlash(null)}>
                  {flash.text}
                  {flash.undo && (
                    <button
                      type="button"
                      className="button button-small"
                      onClick={() => {
                        dispatch({ type: 'state/replace', state: flash.undo! })
                        setFlash(null)
                      }}
                    >
                      Undo
                    </button>
                  )}
                </Notice>
              )}
              {!step && weekIsOver && (
                <Notice>
                  The week of {formatWeekRange(week.start)} is over.
                  <button type="button" className="button button-small" onClick={() => goToStep('wrapup')}>
                    Plan next week
                  </button>
                </Notice>
              )}
              {!step && backupOverdue && !hidden.has('backup') && (
                <Notice onDismiss={() => hide('backup')}>
                  {state.lastBackupAt
                    ? `Your last backup was ${formatSince(state.lastBackupAt, today)}.`
                    : "Your planner hasn't been backed up yet."}{' '}
                  Everything lives in this browser only.
                  <button type="button" className="button button-small" onClick={() => saveBackup()}>
                    Export backup
                  </button>
                </Notice>
              )}
              {!step && !weekIsOver && isEmpty && (
                <Notice>
                  Click any line on the page to start writing, or let the planner walk you through it.
                  <button type="button" className="button button-small" onClick={() => goToStep('goals')}>
                    Plan the week
                  </button>
                </Notice>
              )}
            </div>

            {historyOpen && <PastWeeks onClose={() => setHistoryOpen(false)} />}
            {/* Kept mounted while looking back, so Print still prints this week. */}
            <div hidden={historyOpen}>
              <PageEditor data={sheet} focus={stepFocus(step)} />
            </div>
          </div>

          {backlogOpen && <BacklogDrawer onClose={() => setBacklogOpen(false)} />}

          <DragOverlay dropAnimation={null}>
            {dragging && (
              <div className="drag-card">
                <CategoryTag id={dragging.category} />
                <span>{dragging.text}</span>
                {dragging.kind === 'task' &&
                  (copying ? <span className="drag-copy">+ copy</span> : <span className="drag-hint">⌥ to copy</span>)}
              </div>
            )}
          </DragOverlay>
        </DropSpotContext>
      </DndContext>
    </EditorContext>
  )
}

function Notice({ children, tone, onDismiss }: { children: ReactNode; tone?: 'warning'; onDismiss?: () => void }) {
  return (
    <div className={`notice${tone ? ` notice-${tone}` : ''}`} role="status">
      <div className="notice-body">{children}</div>
      {onDismiss && <IconButton icon="x" label="Dismiss" onClick={onDismiss} />}
    </div>
  )
}
