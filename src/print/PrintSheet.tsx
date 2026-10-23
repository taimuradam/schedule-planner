import type { CSSProperties, Ref } from 'react'
import { CATEGORIES, category } from '../model/categories'
import { dayOfMonth, formatWeekRange, monthName, WEEKDAY_LETTER, WEEKDAY_SHORT, WEEKDAYS } from '../model/dates'
import type { CategoryId, DailyTask, DayTask, Goal } from '../model/types'
import './print.css'

export interface SheetData {
  weekStart: string
  goalMonth: string
  goals: Goal[]
  dailyTasks: DailyTask[]
  tasks: DayTask[]
}

// Empty rows left for writing in by hand during the week.
const MIN_GOAL_ROWS = 3
const MIN_DAILY_ROWS = 4
const BLANK_DAY_LINES = 24

function Tag({ id }: { id: CategoryId }) {
  return <span className="sheet-tag">{category(id).letter}</span>
}

function Box() {
  return <span className="sheet-box" />
}

function blanks(count: number): number[] {
  return Array.from({ length: Math.max(0, count) }, (_, i) => i)
}

/**
 * One printed page, laid out in physical units for US Letter landscape.
 * `fit` scales the type down so a busy week still fits on the page.
 */
export function PrintSheet({ data, fit, ref }: { data: SheetData; fit: number; ref?: Ref<HTMLDivElement> }) {
  const { weekStart, goalMonth, goals, dailyTasks, tasks } = data

  return (
    <div className="sheet" ref={ref} style={{ '--fit': fit } as CSSProperties}>
      <header className="sheet-head">
        <h1 className="sheet-title">Week of {formatWeekRange(weekStart)}</h1>
        <div className="sheet-legend">
          {CATEGORIES.map((c) => (
            <span key={c.id}>
              <Tag id={c.id} /> {c.name}
            </span>
          ))}
        </div>
      </header>

      <div className="sheet-top">
        <section className="sheet-goals">
          <h2 className="sheet-label">{monthName(goalMonth)} goals</h2>
          <ol className="sheet-goal-list">
            {goals.map((g) => (
              <li key={g.id} className="sheet-row">
                <Tag id={g.category} />
                <span>{g.text}</span>
              </li>
            ))}
            {blanks(MIN_GOAL_ROWS - goals.length).map((i) => (
              <li key={`blank-${i}`} className="sheet-row sheet-row-blank" />
            ))}
          </ol>
        </section>

        <section className="sheet-daily">
          <h2 className="sheet-label">Every day</h2>
          <table className="sheet-daily-table">
            <colgroup>
              <col className="sheet-daily-name" />
              {WEEKDAYS.map((d) => (
                <col key={d} />
              ))}
            </colgroup>
            <thead>
              <tr>
                <th />
                {WEEKDAYS.map((d) => (
                  <th key={d} scope="col">
                    {WEEKDAY_LETTER[d]}
                    <span className="sheet-daily-date">{dayOfMonth(weekStart, d)}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dailyTasks.map((t) => (
                <tr key={t.id}>
                  <th scope="row">
                    <Tag id={t.category} /> {t.text}
                  </th>
                  {WEEKDAYS.map((d) => (
                    <td key={d}>
                      <Box />
                    </td>
                  ))}
                </tr>
              ))}
              {blanks(MIN_DAILY_ROWS - dailyTasks.length).map((i) => (
                <tr key={`blank-${i}`} className="sheet-row-blank">
                  <th scope="row" />
                  {WEEKDAYS.map((d) => (
                    <td key={d}>
                      <Box />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>

      <section className="sheet-days">
        <h2 className="sheet-label">Day by day</h2>
        <div className="sheet-day-grid">
          {WEEKDAYS.map((d) => (
            <div key={d} className="sheet-day" data-fit>
              <h3 className="sheet-day-head">
                {WEEKDAY_SHORT[d]} <span className="sheet-day-date">{dayOfMonth(weekStart, d)}</span>
              </h3>
              <ul className="sheet-task-list">
                {tasks
                  .filter((t) => t.day === d)
                  .map((t) => (
                    <li key={t.id} className="sheet-task">
                      <Box />
                      <span className="sheet-task-text">{t.text}</span>
                      <Tag id={t.category} />
                    </li>
                  ))}
              </ul>
              <div className="sheet-lines" aria-hidden="true">
                {blanks(BLANK_DAY_LINES).map((i) => (
                  <div key={i} className="sheet-line" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
