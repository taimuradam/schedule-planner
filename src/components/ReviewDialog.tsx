import { useEffect, useRef, useState } from 'react'
import { formatShortDate, formatWeekRange, nextWeekStart, WEEKDAY_LONG, WEEKDAYS } from '../model/dates'
import { currentWeek } from '../model/planner'
import { usePlanner, usePlannerDispatch } from '../state/contexts'
import { CategoryTag } from './ui'

/**
 * Sunday review: tick what got crossed off on paper. Everything else moves to
 * the backlog and the next week opens.
 */
export function ReviewDialog({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const state = usePlanner()
  const dispatch = usePlannerDispatch()
  const week = currentWeek(state)
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [done, setDone] = useState(() => new Set(week.tasks.filter((t) => t.done).map((t) => t.id)))
  const [nextStart] = useState(() => nextWeekStart(week.start, new Date()))

  // No close() on cleanup: its close event arrives late and would shut the
  // dialog again after a remount. Unmounting removes it from the page anyway.
  useEffect(() => {
    const dialog = dialogRef.current
    if (dialog && !dialog.open) dialog.showModal()
  }, [])

  const toggle = (id: string) =>
    setDone((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const rollingOver = week.tasks.filter((t) => !done.has(t.id) && !t.repeatingId).length

  const finish = () => {
    dispatch({ type: 'week/review', doneIds: [...done], nextStart })
    onDone()
  }

  return (
    <dialog className="dialog" ref={dialogRef} onClose={onClose} aria-labelledby="review-title">
      <h2 id="review-title" className="dialog-title">
        Review the week of {formatWeekRange(week.start)}
      </h2>
      <p className="hint">Tick what you crossed off on paper.</p>

      {week.tasks.length === 0 ? (
        <p className="empty">No tasks were planned this week.</p>
      ) : (
        <div className="review-days">
          {WEEKDAYS.map((day) => {
            const tasks = week.tasks.filter((t) => t.day === day)
            if (tasks.length === 0) return null
            return (
              <fieldset key={day} className="review-day">
                <legend>{WEEKDAY_LONG[day]}</legend>
                {tasks.map((t) => (
                  <label key={t.id} className={`review-task${done.has(t.id) ? ' review-task-done' : ''}`}>
                    <input type="checkbox" className="checkbox" checked={done.has(t.id)} onChange={() => toggle(t.id)} />
                    <CategoryTag id={t.category} />
                    <span>{t.text}</span>
                  </label>
                ))}
              </fieldset>
            )
          })}
        </div>
      )}

      <p className="review-summary">
        {rollingOver === 0
          ? 'Nothing to carry over.'
          : `${rollingOver} unfinished ${rollingOver === 1 ? 'task moves' : 'tasks move'} to the top of the backlog.`}{' '}
        Weekly tasks come back on their own.
      </p>

      <div className="dialog-actions">
        <button type="button" className="button" onClick={() => dialogRef.current?.close()}>
          Cancel
        </button>
        <button type="button" className="button button-primary" onClick={finish}>
          Start week of {formatShortDate(nextStart)}
        </button>
      </div>
    </dialog>
  )
}
