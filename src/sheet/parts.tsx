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

export function BoxCells() {
  return WEEKDAYS.map((d) => (
    <td key={d}>
      <Box />
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
