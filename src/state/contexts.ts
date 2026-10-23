import { createContext, useContext, type Dispatch } from 'react'
import type { Action } from '../model/planner'
import type { PlannerState } from '../model/types'

export const StateContext = createContext<PlannerState | null>(null)
export const DispatchContext = createContext<Dispatch<Action> | null>(null)
export const SaveErrorContext = createContext(false)

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

export function useSaveFailed(): boolean {
  return useContext(SaveErrorContext)
}
