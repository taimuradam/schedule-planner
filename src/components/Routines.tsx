import { useState } from 'react'
import { goalMonthOf, monthName, WEEKDAY_LONG, WEEKDAY_SHORT, WEEKDAYS } from '../model/dates'
import { currentGoals, newId } from '../model/planner'
import type { Weekday } from '../model/types'
import { usePlanner, usePlannerDispatch } from '../state/contexts'
import { AddItemForm, CategoryTag, EditableText, IconButton } from './ui'

export function Routines() {
  return (
    <div className="routines">
      <GoalsCard />
      <DailyCard />
      <RepeatingCard />
    </div>
  )
}

function GoalsCard() {
  const state = usePlanner()
  const dispatch = usePlannerDispatch()
  const month = goalMonthOf(state.currentWeek)
  const goals = currentGoals(state)

  return (
    <section className="card-panel">
      <h3 className="card-panel-title">{monthName(month)} goals</h3>
      <p className="hint">Printed at the top of every week this month.</p>
      <ul className="row-list">
        {goals.map((g) => (
          <li key={g.id} className="row">
            <CategoryTag id={g.category} onChange={(category) => dispatch({ type: 'goal/update', id: g.id, patch: { category } })} />
            <EditableText value={g.text} onSave={(text) => dispatch({ type: 'goal/update', id: g.id, patch: { text } })} />
            <IconButton icon="x" label={`Remove ${g.text}`} className="row-remove" onClick={() => dispatch({ type: 'goal/remove', id: g.id })} />
          </li>
        ))}
      </ul>
      <AddItemForm
        label={`Add a ${monthName(month)} goal`}
        placeholder="Land 5 first-round interviews"
        onAdd={(text, category) => dispatch({ type: 'goal/add', id: newId(), month, text, category })}
      />
    </section>
  )
}

function DailyCard() {
  const state = usePlanner()
  const dispatch = usePlannerDispatch()

  return (
    <section className="card-panel">
      <h3 className="card-panel-title">Every day</h3>
      <p className="hint">Each gets a row of seven tick boxes. Untick one to leave it off the page.</p>
      <ul className="row-list">
        {state.dailyTasks.map((t) => (
          <li key={t.id} className={`row${t.active ? '' : ' row-inactive'}`}>
            <input
              type="checkbox"
              className="checkbox"
              checked={t.active}
              aria-label={`Print ${t.text}`}
              title={t.active ? 'On the page' : 'Left off the page'}
              onChange={(e) => dispatch({ type: 'daily/update', id: t.id, patch: { active: e.target.checked } })}
            />
            <CategoryTag id={t.category} onChange={(category) => dispatch({ type: 'daily/update', id: t.id, patch: { category } })} />
            <EditableText value={t.text} onSave={(text) => dispatch({ type: 'daily/update', id: t.id, patch: { text } })} />
            <IconButton icon="x" label={`Remove ${t.text}`} className="row-remove" onClick={() => dispatch({ type: 'daily/remove', id: t.id })} />
          </li>
        ))}
      </ul>
      <AddItemForm
        label="Add a daily task"
        placeholder="1 LeetCode problem"
        onAdd={(text, category) => dispatch({ type: 'daily/add', id: newId(), text, category })}
      />
    </section>
  )
}

function WeekdaySelect({ value, onChange }: { value: Weekday; onChange: (day: Weekday) => void }) {
  return (
    <select
      className="select select-weekday"
      aria-label="Day of the week"
      value={value}
      onChange={(e) => onChange(Number(e.target.value) as Weekday)}
    >
      {WEEKDAYS.map((d) => (
        <option key={d} value={d}>
          {WEEKDAY_SHORT[d]}
        </option>
      ))}
    </select>
  )
}

function RepeatingCard() {
  const state = usePlanner()
  const dispatch = usePlannerDispatch()
  const [weekday, setWeekday] = useState<Weekday>(0)
  const sorted = [...state.repeating].sort((a, b) => a.weekday - b.weekday)

  return (
    <section className="card-panel">
      <h3 className="card-panel-title">Every week</h3>
      <p className="hint">Added to the same day each new week, like class deadlines.</p>
      <ul className="row-list">
        {sorted.map((r) => (
          <li key={r.id} className="row">
            <WeekdaySelect value={r.weekday} onChange={(day) => dispatch({ type: 'repeating/update', id: r.id, patch: { weekday: day } })} />
            <CategoryTag id={r.category} onChange={(category) => dispatch({ type: 'repeating/update', id: r.id, patch: { category } })} />
            <EditableText value={r.text} onSave={(text) => dispatch({ type: 'repeating/update', id: r.id, patch: { text } })} />
            <IconButton
              icon="x"
              label={`Stop repeating ${r.text} on ${WEEKDAY_LONG[r.weekday]}`}
              className="row-remove"
              onClick={() => dispatch({ type: 'repeating/remove', id: r.id })}
            />
          </li>
        ))}
      </ul>
      <AddItemForm
        compact
        label="Add a weekly task"
        placeholder="Problem set due"
        before={<WeekdaySelect value={weekday} onChange={setWeekday} />}
        onAdd={(text, category) => dispatch({ type: 'repeating/add', id: newId(), weekday, text, category })}
      />
    </section>
  )
}
