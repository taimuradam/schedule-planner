import { useState } from 'react'
import { useEditor } from '../editor/editorContext'
import {
  formatShortDate,
  formatWeekRange,
  goalMonthOf,
  monthName,
  nextWeekStart,
  WEEKDAY_LONG,
  WEEKDAYS,
} from '../model/dates'
import { currentWeek } from '../model/planner'
import { usePlanner, usePlannerDispatch } from '../state/contexts'
import { STEPS, type Step } from './steps'
import { CategoryTag, Icon, IconButton } from './ui'

/**
 * The Sunday routine as a bar above the page. Each step points at one part of
 * the same page you'd edit any other day, rather than a separate screen.
 */
export function PlanningSteps({
  step,
  onStep,
  onClose,
  onPrint,
}: {
  step: Step
  onStep: (step: Step) => void
  onClose: () => void
  onPrint: () => void
}) {
  const state = usePlanner()
  const index = STEPS.findIndex((s) => s.id === step)
  // Only steps you've actually been through get a check, so a skipped
  // wrap-up doesn't look done.
  const [visited, setVisited] = useState<ReadonlySet<Step>>(() => new Set([step]))
  const go = (i: number) => {
    const next = STEPS[Math.max(0, Math.min(STEPS.length - 1, i))].id
    setVisited((prev) => new Set(prev).add(next))
    onStep(next)
  }
  const month = monthName(goalMonthOf(state.currentWeek))

  const hints: Record<Exclude<Step, 'wrapup'>, string> = {
    goals: `These print at the top of every week in ${month}. Click a goal to change it, or a blank line to add one.`,
    daily: 'Each gets a row of seven tick boxes. Click one to change it, or a blank line to add one.',
    days: "Drag tasks in from the backlog, or click a day's blank lines and type. Add #j, #s, #h or #p to set the category.",
    print: "That's the week. Print it and stick it on the fridge.",
  }

  return (
    <section className="steps" aria-label="Plan the week">
      <div className="steps-bar">
        <ol className="steps-list">
          {STEPS.map((s, i) => {
            const done = i < index && visited.has(s.id)
            return (
              <li key={s.id}>
                <button
                  type="button"
                  className={`step${done ? ' is-done' : ''}${i === index ? ' is-current' : ''}`}
                  aria-current={i === index ? 'step' : undefined}
                  onClick={() => go(i)}
                >
                  <span className="step-dot">{done ? <Icon name="check" size={12} /> : i + 1}</span>
                  {s.label}
                </button>
              </li>
            )
          })}
        </ol>
        <IconButton icon="x" label="Close the planning steps" onClick={onClose} />
      </div>

      {step === 'wrapup' ? (
        <WrapUp onNext={() => go(1)} />
      ) : (
        <div className="step-panel">
          <p className="step-hint">{hints[step]}</p>
          <div className="step-actions">
            <button type="button" className="button" onClick={() => go(index - 1)}>
              Back
            </button>
            {step === 'print' ? (
              <>
                <button type="button" className="button" onClick={onClose}>
                  Done
                </button>
                <button type="button" className="button button-primary" onClick={onPrint}>
                  <Icon name="printer" /> Print
                </button>
              </>
            ) : (
              <button type="button" className="button button-primary" onClick={() => go(index + 1)}>
                Next
              </button>
            )}
          </div>
        </div>
      )}
    </section>
  )
}

/** Tick off what got done on paper; the rest rolls to the backlog. */
function WrapUp({ onNext }: { onNext: () => void }) {
  const state = usePlanner()
  const dispatch = usePlannerDispatch()
  const editor = useEditor()
  const week = currentWeek(state)
  const [done, setDone] = useState(() => new Set(week.tasks.filter((t) => t.done).map((t) => t.id)))
  const [nextStart] = useState(() => nextWeekStart(week.start, new Date()))
  const rollingOver = week.tasks.filter((t) => !done.has(t.id) && !t.repeatingId).length

  const toggle = (id: string) =>
    setDone((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const startNextWeek = () => {
    dispatch({ type: 'week/review', doneIds: [...done], nextStart })
    editor.notify(
      `Started the week of ${formatWeekRange(nextStart)}. Unfinished tasks are at the top of the backlog.`,
      state,
    )
    onNext()
  }

  return (
    <div className="step-panel step-panel-wrapup">
      <div>
        <h2 className="step-title">Wrap up {formatWeekRange(week.start)}</h2>
        <p className="step-hint">
          Tick what you crossed off on paper.{' '}
          {rollingOver > 0 &&
            `${rollingOver} unfinished ${rollingOver === 1 ? 'task moves' : 'tasks move'} to the backlog. `}
          Weekly tasks come back on their own.
        </p>
      </div>

      {week.tasks.length === 0 ? (
        <p className="step-empty">Nothing was planned this week.</p>
      ) : (
        <div className="wrapup-days">
          {WEEKDAYS.map((day) => {
            const tasks = week.tasks.filter((t) => t.day === day)
            if (tasks.length === 0) return null
            return (
              <fieldset key={day} className="wrapup-day">
                <legend>{WEEKDAY_LONG[day]}</legend>
                {tasks.map((t) => (
                  <label key={t.id} className={`wrapup-task${done.has(t.id) ? ' is-done' : ''}`}>
                    <input
                      type="checkbox"
                      className="checkbox"
                      checked={done.has(t.id)}
                      onChange={() => toggle(t.id)}
                    />
                    <CategoryTag id={t.category} />
                    <span>{t.text}</span>
                  </label>
                ))}
              </fieldset>
            )
          })}
        </div>
      )}

      <div className="step-actions">
        <button type="button" className="button" onClick={onNext}>
          Keep planning this week
        </button>
        <button type="button" className="button button-primary" onClick={startNextWeek}>
          Start week of {formatShortDate(nextStart)}
        </button>
      </div>
    </div>
  )
}
