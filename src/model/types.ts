export type CategoryId = 'job' | 'side' | 'school'

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

/** Something done every day; printed as a row of seven tick boxes. */
export interface DailyTask {
  id: string
  text: string
  category: CategoryId
  active: boolean
}

/** Pinned to a weekday and pre-filled into every new week. */
export interface RepeatingTask {
  id: string
  weekday: Weekday
  text: string
  category: CategoryId
}

export interface BacklogItem {
  id: string
  text: string
  category: CategoryId
  /** Rolled over unfinished from a reviewed week. */
  carriedOver: boolean
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
}

export interface Week {
  /** YYYY-MM-DD of the Monday. */
  start: string
  tasks: DayTask[]
  reviewed: boolean
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
}
