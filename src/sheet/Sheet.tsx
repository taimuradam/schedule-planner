import { useState, type CSSProperties, type Ref } from 'react'
import { CATEGORIES } from '../model/categories'
import { FOCUS_LIMIT } from '../model/planner'
import { dayOfMonth, formatWeekRange, monthName, WEEKDAY_LETTER, WEEKDAYS } from '../model/dates'
import type { DailyTask, DayTask, FocusItem, Goal, Weekday } from '../model/types'
import {
  AddGoalLine,
  AddDailyRow,
  AddFocusLine,
  EditableFocus,
  CopyGoalsButton,
  EditableDailyRow,
  EditableDay,
  EditableGoal,
  SectionAddButton,
} from './editable'
import { BLANK_DAY_LINES, blanks, MIN_DAILY_ROWS, MIN_GOAL_ROWS, SheetDatesContext } from './lines'
import { Box, BoxCells, DayHead, DueTag, Tag } from './parts'
import './sheet.css'
import './editing.css'

export interface SheetData {
  weekStart: string
  /** YYYY-MM-DD, for due-date labels. */
  today: string
  goalMonth: string
  goals: Goal[]
  focus: FocusItem[]
  dailyTasks: DailyTask[]
  /** Looking back at a past week: cross off what got done. */
  showDone?: boolean
  /** Habit days ticked off in a past week's review, by habit id. */
  habitTicks?: Record<string, Weekday[]>
  tasks: DayTask[]
}

/** Which part of the page the Sunday steps are pointing at. */
export type SheetFocus = 'goals' | 'focus' | 'daily' | 'days'

/**
 * The page, laid out in physical units for US Letter landscape. The same
 * component is the printout and, with `editing`, the editor on screen, so
 * what you edit is exactly what prints. `fit` scales the type down so a busy
 * week still fits on one page.
 */
export function Sheet({
  data,
  fit,
  editing = false,
  fluid = editing,
  focus,
  ref,
}: {
  data: SheetData
  fit: number
  editing?: boolean
  /** Scale to the width it's given instead of the physical page size. */
  fluid?: boolean
  focus?: SheetFocus
  ref?: Ref<HTMLDivElement>
}) {
  const { weekStart, goalMonth } = data
  // Hidden daily tasks stay visible (dimmed) while editing so they can be put back.
  const dailyTasks = editing ? data.dailyTasks : data.dailyTasks.filter((t) => t.active)

  return (
    <SheetDatesContext value={{ weekStart, today: data.today }}>
      <div
        className={`sheet${fluid ? ' is-fluid' : ''}${editing ? ' is-editing' : ''}`}
        ref={ref}
        data-focus={focus}
        style={{ '--fit': fit } as CSSProperties}
      >
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
          <div className="sheet-left">
            <section className="sheet-goals" data-section="goals">
              <GoalList goals={data.goals} month={goalMonth} editing={editing} />
            </section>
            <section className="sheet-focus" data-section="focus">
              <FocusList focus={data.focus} editing={editing} showDone={data.showDone} />
            </section>
          </div>

          <section className="sheet-daily" data-section="daily">
            <DailyTable weekStart={weekStart} dailyTasks={dailyTasks} editing={editing} ticks={data.habitTicks} />
          </section>
        </div>

        <section className="sheet-days" data-section="days">
          <h2 className="sheet-label">Day by day</h2>
          <div className="sheet-day-grid">
            {WEEKDAYS.map((d) => {
              const tasks = data.tasks.filter((t) => t.day === d)
              return editing ? (
                <EditableDay key={d} day={d} date={dayOfMonth(weekStart, d)} tasks={tasks} />
              ) : (
                <StaticDay key={d} day={d} date={dayOfMonth(weekStart, d)} tasks={tasks} showDone={data.showDone} />
              )
            })}
          </div>
        </section>
      </div>
    </SheetDatesContext>
  )
}

function GoalList({ goals, month, editing }: { goals: Goal[]; month: string; editing: boolean }) {
  const [adding, setAdding] = useState(false)
  const rows = goals.length + (adding ? 1 : 0)

  return (
    <>
      <div className="sheet-label-row">
        <h2 className="sheet-label">{monthName(month)} goals</h2>
        {editing && goals.length === 0 && <CopyGoalsButton month={month} />}
        {editing && !adding && rows >= MIN_GOAL_ROWS && (
          <SectionAddButton label="Add a goal" onClick={() => setAdding(true)} />
        )}
      </div>
      <ol className="sheet-goal-list">
        {goals.map((g) =>
          editing ? (
            <EditableGoal key={g.id} goal={g} />
          ) : (
            <li key={g.id} className="sheet-row">
              <Tag id={g.category} />
              <span className="sheet-row-text">{g.text}</span>
            </li>
          ),
        )}
        {editing && adding && <AddGoalLine month={month} onClose={() => setAdding(false)} />}
        {blanks(MIN_GOAL_ROWS - rows).map((i) => (
          <li key={`blank-${i}`} className="sheet-row sheet-row-blank">
            {editing && i === 0 && <SectionAddButton label="Add a goal" onClick={() => setAdding(true)} fill />}
          </li>
        ))}
      </ol>
    </>
  )
}

function FocusList({ focus, editing, showDone }: { focus: FocusItem[]; editing: boolean; showDone?: boolean }) {
  const [adding, setAdding] = useState(false)
  const rows = focus.length + (adding ? 1 : 0)

  return (
    <>
      <h2 className="sheet-label">Top 3 this week</h2>
      <ol className="sheet-goal-list">
        {focus.map((f) =>
          editing ? (
            <EditableFocus key={f.id} item={f} />
          ) : (
            <li key={f.id} className={`sheet-row${showDone && f.done ? ' is-done' : ''}`}>
              <Box ticked={showDone && f.done} />
              <span className="sheet-row-text">{f.text}</span>
              <Tag id={f.category} />
            </li>
          ),
        )}
        {editing && adding && <AddFocusLine onClose={() => setAdding(false)} />}
        {blanks(FOCUS_LIMIT - rows).map((i) => (
          <li key={`blank-${i}`} className="sheet-row sheet-row-blank">
            <Box />
            {editing && i === 0 && <SectionAddButton label="Add a priority" onClick={() => setAdding(true)} fill />}
          </li>
        ))}
      </ol>
    </>
  )
}

function DailyTable({
  weekStart,
  dailyTasks,
  editing,
  ticks,
}: {
  weekStart: string
  dailyTasks: DailyTask[]
  editing: boolean
  ticks?: Record<string, Weekday[]>
}) {
  const [adding, setAdding] = useState(false)
  const rows = dailyTasks.length + (adding ? 1 : 0)

  return (
    <>
      <div className="sheet-label-row">
        <h2 className="sheet-label">Every day</h2>
        {editing && !adding && rows >= MIN_DAILY_ROWS && (
          <SectionAddButton label="Add a daily task" onClick={() => setAdding(true)} />
        )}
      </div>
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
          {dailyTasks.map((t) =>
            editing ? (
              <EditableDailyRow key={t.id} task={t} />
            ) : (
              <tr key={t.id}>
                <th scope="row">
                  <Tag id={t.category} /> {t.text}
                </th>
                <BoxCells days={t.days} ticked={ticks?.[t.id]} />
              </tr>
            ),
          )}
          {editing && adding && <AddDailyRow onClose={() => setAdding(false)} />}
          {blanks(MIN_DAILY_ROWS - rows).map((i) => (
            <tr key={`blank-${i}`} className="sheet-row-blank">
              <th scope="row">
                {editing && i === 0 && (
                  <SectionAddButton label="Add a daily task" onClick={() => setAdding(true)} fill />
                )}
              </th>
              <BoxCells />
            </tr>
          ))}
        </tbody>
      </table>
    </>
  )
}

function StaticDay({
  day,
  date,
  tasks,
  showDone,
}: {
  day: Weekday
  date: number
  tasks: DayTask[]
  showDone?: boolean
}) {
  return (
    <div className="sheet-day" data-fit>
      <DayHead day={day} date={date} />
      <ul className="sheet-task-list">
        {tasks.map((t) => (
          <li key={t.id} className={`sheet-task${showDone && t.done ? ' is-done' : ''}`}>
            <Box ticked={showDone && t.done} />
            <span className="sheet-task-text">
              {t.text}
              <DueTag due={t.due} day={day} />
            </span>
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
  )
}
