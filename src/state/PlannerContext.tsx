import { useEffect, useReducer, useState, type ReactNode } from 'react'
import { createInitialState, plannerReducer } from '../model/planner'
import { loadState, saveState } from '../model/storage'
import { DispatchContext, SaveErrorContext, StateContext } from './contexts'

export function PlannerProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(plannerReducer, null, () => loadState() ?? createInitialState(new Date()))
  const [saveFailed, setSaveFailed] = useState(false)

  // Every change is saved straight to the browser.
  useEffect(() => {
    setSaveFailed(!saveState(state))
  }, [state])

  return (
    <StateContext value={state}>
      <DispatchContext value={dispatch}>
        <SaveErrorContext value={saveFailed}>{children}</SaveErrorContext>
      </DispatchContext>
    </StateContext>
  )
}
