export type CategoryId = 'job' | 'side' | 'school' | 'personal'

export interface Category {
  id: CategoryId
  /** Single letter printed as the tag, so categories survive black-and-white printing. */
  letter: string
  name: string
}

/** 0 = Monday … 6 = Sunday. Weeks run Monday to Sunday. */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6

export interface Goal {
  id: string
  /** YYYY-MM */
  month: string
  text: string
  category: CategoryId
}

/** A habit with a tick box for each day it's done, in a row of seven. */
export interface DailyTask {
  id: string
  text: string
  category: CategoryId
  active: boolean
  /** Days it's done; skipped days print a dash instead of a box. */
  days: Weekday[]
}

/** Pinned to one or more weekdays and pre-filled into every new week. */
export interface RepeatingTask {
  id: string
  weekdays: Weekday[]
  text: string
  category: CategoryId
}

export interface BacklogItem {
  id: string
  text: string
  category: CategoryId
  /** Rolled over unfinished from a reviewed week. */
  carriedOver: boolean
  /** YYYY-MM-DD it's due. Only a hint; it never moves the item. */
  due?: string
}

export interface DayTask {
  id: string
  day: Weekday
  text: string
  category: CategoryId
  /** Set during the Sunday review from what was crossed off on paper. */
  done: boolean
  carriedOver: boolean
  repeatingId?: string
  /** Shared by copies of the same task on different days of one week. */
  groupId?: string
  /** YYYY-MM-DD it's due, carried over from the backlog. */
  due?: string
  /** Dragged into its spot by hand, so it stays put instead of sitting with its category. */
  placed?: boolean
}

/** One of the week's top three priorities, printed under the monthly goals. */
export interface FocusItem {
  id: string
  text: string
  category: CategoryId
  done: boolean
}

/** How a habit went in a reviewed week, kept whole so history survives later edits. */
export interface HabitLog {
  id: string
  text: string
  category: CategoryId
  /** Days it was meant to be done. */
  days: Weekday[]
  /** Days it was ticked off on paper. */
  done: Weekday[]
}

export interface Week {
  /** YYYY-MM-DD of the Monday. */
  start: string
  tasks: DayTask[]
  reviewed: boolean
  focus: FocusItem[]
  /** Recorded during the review; missing if habits weren't ticked off. */
  habits?: HabitLog[]
}

export interface PlannerState {
  version: 1
  goals: Goal[]
  dailyTasks: DailyTask[]
  repeating: RepeatingTask[]
  backlog: BacklogItem[]
  weeks: Record<string, Week>
  /** Start of the week being planned and printed. */
  currentWeek: string
  /** When a backup file was last saved (ISO date-time). */
  lastBackupAt?: string
}
