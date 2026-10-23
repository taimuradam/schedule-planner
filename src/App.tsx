import {
  DndContext,
  DragOverlay,
  PointerSensor,
  pointerWithin,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
} from '@dnd-kit/core'
import { useMemo, useRef, useState, type ReactNode } from 'react'
import { BACKLOG_DROP, BacklogDrawer } from './components/BacklogDrawer'
import { PlanningSteps } from './components/PlanningSteps'
import { stepFocus, type Step } from './components/steps'
import { CategoryTag, Icon, IconButton } from './components/ui'
import { EditorContext, type Editor } from './editor/editorContext'
import { Menu, MenuItem } from './editor/Menu'
import { formatWeekRange, goalMonthOf, planningWeekStart, WEEKDAY_LONG } from './model/dates'
import { currentGoals, currentWeek } from './model/planner'
import { downloadBackup, readBackup } from './model/storage'
import type { CategoryId, PlannerState, Weekday } from './model/types'
import type { DragData } from './sheet/lines'
import { PageEditor } from './sheet/PageEditor'
import type { SheetData } from './sheet/Sheet'
import { usePlanner, usePlannerDispatch, useSaveFailed } from './state/contexts'

type Flash = { text: string; undo?: PlannerState; tone?: 'warning' }

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

export default function App() {
  const state = usePlanner()
  const dispatch = usePlannerDispatch()
  const saveFailed = useSaveFailed()
  const week = currentWeek(state)
  const [today] = useState(() => new Date())
  const [step, setStep] = useState<Step | null>(null)
  const [backlogOpen, setBacklogOpen] = useState(false)
  const [flash, setFlash] = useState<Flash | null>(null)
  const [lastCategory, setLastCategory] = useState<CategoryId>('job')
  const [dragging, setDragging] = useState<DragData | null>(null)
  const [moreAnchor, setMoreAnchor] = useState<HTMLElement | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const weekIsOver = planningWeekStart(today) > week.start
  const isEmpty =
    state.goals.length === 0 && state.dailyTasks.length === 0 && state.backlog.length === 0 && week.tasks.length === 0

  // Pointer only: drags start after a few pixels so clicks still edit. Keyboard
  // users move tasks with "Move to" in each task's menu instead.
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const editor = useMemo<Editor>(
    () => ({ lastCategory, setLastCategory, notify: (text, undo) => setFlash({ text, undo }) }),
    [lastCategory],
  )

  const sheet = useMemo<SheetData>(() => {
    const { start, tasks } = currentWeek(state)
    return {
      weekStart: start,
      goalMonth: goalMonthOf(start),
      goals: currentGoals(state),
      dailyTasks: state.dailyTasks,
      tasks,
    }
  }, [state])

  const goToStep = (next: Step) => {
    setStep(next)
    if (next === 'days') setBacklogOpen(true)
  }

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
        collisionDetection={pointerWithin}
        accessibility={{ announcements }}
        onDragStart={({ active }) => setDragging(active.data.current as DragData)}
        onDragEnd={onDragEnd}
        onDragCancel={() => setDragging(null)}
      >
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
                  <MenuItem
                    icon="download"
                    onSelect={() => {
                      downloadBackup(state)
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
            <PlanningSteps step={step} onStep={goToStep} onClose={() => setStep(null)} onPrint={() => window.print()} />
          )}

          <div className="notices">
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
            {!step && !weekIsOver && isEmpty && (
              <Notice>
                Click any line on the page to start writing, or let the planner walk you through it.
                <button type="button" className="button button-small" onClick={() => goToStep('goals')}>
                  Plan the week
                </button>
              </Notice>
            )}
          </div>

          <PageEditor data={sheet} focus={stepFocus(step)} />
        </div>

        {backlogOpen && <BacklogDrawer onClose={() => setBacklogOpen(false)} />}

        <DragOverlay dropAnimation={null}>
          {dragging && (
            <div className="drag-card">
              <CategoryTag id={dragging.category} />
              <span>{dragging.text}</span>
            </div>
          )}
        </DragOverlay>
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
