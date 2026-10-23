import { useMemo, useRef, useState, type ReactNode } from 'react'
import { PlanBoard } from './components/PlanBoard'
import { ReviewDialog } from './components/ReviewDialog'
import { Routines } from './components/Routines'
import { CategoryTag, Icon, IconButton } from './components/ui'
import { CATEGORIES } from './model/categories'
import { formatWeekRange, goalMonthOf, monthName, planningWeekStart, previousMonth } from './model/dates'
import { currentGoals, currentWeek, goalsForMonth } from './model/planner'
import { downloadBackup, readBackup } from './model/storage'
import type { PlannerState } from './model/types'
import type { SheetData } from './print/PrintSheet'
import { SheetPreview } from './print/SheetPreview'
import { usePlanner, usePlannerDispatch, useSaveFailed } from './state/contexts'

type Flash = { text: string; undo?: PlannerState; tone?: 'warning' }

export default function App() {
  const state = usePlanner()
  const dispatch = usePlannerDispatch()
  const saveFailed = useSaveFailed()
  const week = currentWeek(state)
  const [reviewing, setReviewing] = useState(false)
  const [flash, setFlash] = useState<Flash | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const [today] = useState(() => new Date())

  const goalMonth = goalMonthOf(week.start)
  const lastMonth = previousMonth(goalMonth)
  const isNewMonth = currentGoals(state).length === 0 && goalsForMonth(state, lastMonth).length > 0
  const weekIsOver = planningWeekStart(today) > week.start

  const sheet = useMemo<SheetData>(() => {
    const { start, tasks } = currentWeek(state)
    return {
      weekStart: start,
      goalMonth: goalMonthOf(start),
      goals: currentGoals(state),
      dailyTasks: state.dailyTasks.filter((t) => t.active),
      tasks,
    }
  }, [state])

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
    <div className="app">
      <header className="topbar">
        <div>
          <p className="eyebrow">Weekly planner</p>
          <h1 className="week-title">Week of {formatWeekRange(week.start)}</h1>
        </div>
        <div className="topbar-actions">
          <button type="button" className="button button-ghost" onClick={() => downloadBackup(state)}>
            <Icon name="download" /> Export backup
          </button>
          <button type="button" className="button button-ghost" onClick={() => fileRef.current?.click()}>
            <Icon name="upload" /> Import backup
          </button>
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
          <button type="button" className="button" onClick={() => setReviewing(true)}>
            Start next week
          </button>
          <button type="button" className="button button-primary" onClick={() => window.print()}>
            <Icon name="printer" /> Print
          </button>
        </div>
      </header>

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
        {weekIsOver && !flash && (
          <Notice>
            The week of {formatWeekRange(week.start)} is over. Review it and plan the next one.
            <button type="button" className="button button-small" onClick={() => setReviewing(true)}>
              Review week
            </button>
          </Notice>
        )}
        {isNewMonth && (
          <Notice>
            It's a new month. Set your {monthName(goalMonth)} goals, or start from {monthName(lastMonth)}'s.
            <button
              type="button"
              className="button button-small"
              onClick={() => dispatch({ type: 'goal/copyMonth', from: lastMonth, to: goalMonth })}
            >
              Copy {monthName(lastMonth)}'s goals
            </button>
          </Notice>
        )}
      </div>

      <section className="section" aria-labelledby="plan-title">
        <div className="section-head">
          <h2 id="plan-title" className="section-title">Plan the week</h2>
          <p className="section-hint">
            Drag tasks from the backlog onto a day, or type straight into a day. Click a letter tag to change its
            category.
          </p>
          <div className="legend">
            {CATEGORIES.map((c) => (
              <span key={c.id}>
                <CategoryTag id={c.id} /> {c.name}
              </span>
            ))}
          </div>
        </div>
        <PlanBoard />
      </section>

      <section className="section" aria-labelledby="routines-title">
        <div className="section-head">
          <h2 id="routines-title" className="section-title">Goals and routines</h2>
          <p className="section-hint">These carry over from week to week.</p>
        </div>
        <Routines />
      </section>

      <section className="section" aria-labelledby="preview-title">
        <div className="section-head section-head-row">
          <div>
            <h2 id="preview-title" className="section-title">Print preview</h2>
            <p className="section-hint">US Letter, landscape. This is exactly what prints.</p>
          </div>
          <button type="button" className="button button-primary" onClick={() => window.print()}>
            <Icon name="printer" /> Print
          </button>
        </div>
        <div className="preview-panel">
          <SheetPreview data={sheet} />
        </div>
      </section>

      {reviewing && (
        <ReviewDialog
          onClose={() => setReviewing(false)}
          onDone={() => {
            setReviewing(false)
            setFlash({ text: 'New week started. Unfinished tasks are at the top of the backlog.', undo: state })
          }}
        />
      )}
    </div>
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
