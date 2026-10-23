import { category } from '../model/categories'
import { WEEKDAY_SHORT, WEEKDAYS } from '../model/dates'
import type { CategoryId, Weekday } from '../model/types'

export function Tag({ id }: { id: CategoryId }) {
  return (
    <span className={`sheet-tag sheet-tag-${id}`} title={category(id).name}>
      {category(id).letter}
    </span>
  )
}

export function Box() {
  return <span className="sheet-box" />
}

/** A row of tick boxes, with a faint dash on days the habit is skipped. */
export function BoxCells({ days }: { days?: Weekday[] }) {
  return WEEKDAYS.map((d) => (
    <td key={d}>{!days || days.includes(d) ? <Box /> : <span className="sheet-skip">–</span>}</td>
  ))
}

export function DayHead({ day, date }: { day: Weekday; date: number }) {
  return (
    <h3 className="sheet-day-head">
      {WEEKDAY_SHORT[day]} <span className="sheet-day-date">{date}</span>
    </h3>
  )
}
