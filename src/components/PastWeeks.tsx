import { useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { CATEGORIES } from '../model/categories'
import { formatWeekRange, goalMonthOf, toISODate } from '../model/dates'
import { habitStreaks, pastWeeks, summarizeWeek, type Tally, type WeekSummary } from '../model/history'
import { goalsForMonth } from '../model/planner'
import type { Week } from '../model/types'
import { Sheet, type SheetData } from '../sheet/Sheet'
import { useFitToPage } from '../sheet/useFitToPage'
import { usePlanner } from '../state/contexts'
import { CategoryTag, Icon } from './ui'

const percent = ({ done, total }: Tally) => (total === 0 ? 0 : Math.round((done / total) * 100))

/** Every wrapped-up week, with how it went, and its page as it was printed. */
export function PastWeeks({ onClose }: { onClose: () => void }) {
  const state = usePlanner()
  const weeks = pastWeeks(state)
  const [selected, setSelected] = useState(weeks[0]?.start)
  const streaks = habitStreaks(state).filter((s) => s.days > 0)
  const week = weeks.find((w) => w.start === selected)

  return (
    <section className="history" aria-labelledby="history-title">
      <div className="history-head">
        <h2 id="history-title" className="history-title">
          Past weeks
        </h2>
        <button type="button" className="button" onClick={onClose}>
          <Icon name="arrowLeft" /> Back to this week
        </button>
      </div>

      {weeks.length === 0 ? (
        <p className="history-empty">Weeks show up here once you wrap them up on Sunday.</p>
      ) : (
        <>
          {streaks.length > 0 && (
            <ul className="streaks" aria-label="Habit streaks">
              {streaks.map((s) => (
                <li key={s.id} className="streak">
                  <CategoryTag id={s.category} />
                  <span className="streak-text">{s.text}</span>
                  <span className="streak-days">
                    {s.days} {s.days === 1 ? 'day' : 'days'} in a row
                  </span>
                </li>
              ))}
            </ul>
          )}
          <div className="history-body">
            <ul className="week-list">
              {weeks.map((w) => (
                <li key={w.start}>
                  <WeekRow summary={summarizeWeek(w)} selected={w.start === selected} onSelect={setSelected} />
                </li>
              ))}
            </ul>
            {week && <WeekPage week={week} />}
          </div>
        </>
      )}
    </section>
  )
}

function WeekRow({
  summary,
  selected,
  onSelect,
}: {
  summary: WeekSummary
  selected: boolean
  onSelect: (start: string) => void
}) {
  const { start, tasks, byCategory, habits } = summary
  return (
    <button
      type="button"
      className={`week-row${selected ? ' is-selected' : ''}`}
      aria-pressed={selected}
      onClick={() => onSelect(start)}
    >
      <span className="week-row-head">
        <span className="week-row-title">{formatWeekRange(start)}</span>
        <span className="week-row-total">
          {tasks.done} of {tasks.total} done
        </span>
      </span>
      <span className="week-bars">
        {CATEGORIES.filter((c) => byCategory[c.id].total > 0).map((c) => (
          <span
            key={c.id}
            className="week-bar"
            title={`${c.name}: ${byCategory[c.id].done} of ${byCategory[c.id].total}`}
          >
            <CategoryTag id={c.id} />
            <span className="week-bar-track">
              <span className={`week-bar-fill tag-${c.id}`} style={{ width: `${percent(byCategory[c.id])}%` }} />
            </span>
          </span>
        ))}
      </span>
      <span className="week-row-meta">{habits && <span>Habits: {percent(habits)}%</span>}</span>
    </button>
  )
}

/** A past week's page, read-only, with what got done ticked and crossed out. */
function WeekPage({ week }: { week: Week }) {
  const state = usePlanner()
  const measureRef = useRef<HTMLDivElement>(null)
  const [today] = useState(() => toISODate(new Date()))
  const month = goalMonthOf(week.start)
  const data: SheetData = {
    weekStart: week.start,
    today,
    goalMonth: month,
    goals: goalsForMonth(state, month),
    // The habits as they were that week, if they were ticked off in the review.
    dailyTasks: (week.habits ?? []).map((h) => ({ ...h, active: true })),
    tasks: week.tasks,
    showDone: true,
    habitTicks: Object.fromEntries((week.habits ?? []).map((h) => [h.id, h.done])),
  }
  const { fit } = useFitToPage(measureRef, data)

  return (
    <div className="history-page">
      <div className="page-paper">
        <Sheet data={data} fit={fit} fluid />
      </div>
      {createPortal(
        <div className="measure-copy" aria-hidden="true">
          <Sheet data={data} fit={fit} ref={measureRef} />
        </div>,
        document.body,
      )}
    </div>
  )
}
