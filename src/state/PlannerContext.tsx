import { useEffect, useReducer, useState, type ReactNode } from 'react'
import { createInitialState, plannerReducer } from '../model/planner'
import { loadState, requestPersistentStorage, saveState } from '../model/storage'
import { DispatchContext, StateContext, StorageStatusContext } from './contexts'

export function PlannerProvider({ children }: { children: ReactNode }) {
  const [loaded] = useState(loadState)
  const [state, dispatch] = useReducer(plannerReducer, null, () => loaded.state ?? createInitialState(new Date()))
  const [saveFailed, setSaveFailed] = useState(false)

  useEffect(requestPersistentStorage, [])

  // Every change is saved straight to the browser.
  useEffect(() => {
    setSaveFailed(!saveState(state))
  }, [state])

  return (
    <StateContext value={state}>
      <DispatchContext value={dispatch}>
        <StorageStatusContext value={{ saveFailed, unreadable: loaded.unreadable }}>{children}</StorageStatusContext>
      </DispatchContext>
    </StateContext>
  )
}
