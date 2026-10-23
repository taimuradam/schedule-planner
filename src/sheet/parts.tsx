import { useContext } from 'react'
import { category } from '../model/categories'
import { addDays, dueLabel, parseISODate, WEEKDAY_SHORT, WEEKDAYS } from '../model/dates'
import type { CategoryId, Weekday } from '../model/types'
import { SheetDatesContext } from './lines'

export function Tag({ id }: { id: CategoryId }) {
  return (
    <span className={`sheet-tag sheet-tag-${id}`} title={category(id).name}>
      {category(id).letter}
    </span>
  )
}

/** A tick box; `ticked` draws a check, for looking back at past weeks. */
export function Box({ ticked = false }: { ticked?: boolean }) {
  return <span className={`sheet-box${ticked ? ' is-ticked' : ''}`} />
}

/** A row of tick boxes, with a faint dash on days the habit is skipped. */
export function BoxCells({ days, ticked }: { days?: Weekday[]; ticked?: Weekday[] }) {
  return WEEKDAYS.map((d) => (
    <td key={d}>
      {!days || days.includes(d) ? <Box ticked={ticked?.includes(d)} /> : <span className="sheet-skip">–</span>}
    </td>
  ))
}

export function DayHead({ day, date }: { day: Weekday; date: number }) {
  return (
    <h3 className="sheet-day-head">
      {WEEKDAY_SHORT[day]} <span className="sheet-day-date">{date}</span>
    </h3>
  )
}

/** "due", "due Thu" or "overdue" after a task, read from the day it sits on. */
export function DueTag({ due, day }: { due?: string; day: Weekday }) {
  const { weekStart, today } = useContext(SheetDatesContext)
  if (!due) return null
  const { text, tone } = dueLabel(due, weekStart, parseISODate(today), addDays(weekStart, day))
  return <span className={`sheet-due sheet-due-${tone}`}>{text}</span>
}
