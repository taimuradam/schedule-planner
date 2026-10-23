import { createContext, useContext, type Dispatch } from 'react'
import type { Action } from '../model/planner'
import type { PlannerState } from '../model/types'

export interface StorageStatus {
  /** The browser refused the last save. */
  saveFailed: boolean
  /** Saved data that couldn't be read when the planner opened, kept aside. */
  unreadable: string | null
}

export const StateContext = createContext<PlannerState | null>(null)
export const DispatchContext = createContext<Dispatch<Action> | null>(null)
export const StorageStatusContext = createContext<StorageStatus>({ saveFailed: false, unreadable: null })

export function usePlanner(): PlannerState {
  const state = useContext(StateContext)
  if (!state) throw new Error('usePlanner must be used inside PlannerProvider')
  return state
}

export function usePlannerDispatch(): Dispatch<Action> {
  const dispatch = useContext(DispatchContext)
  if (!dispatch) throw new Error('usePlannerDispatch must be used inside PlannerProvider')
  return dispatch
}

export function useStorageStatus(): StorageStatus {
  return useContext(StorageStatusContext)
}
