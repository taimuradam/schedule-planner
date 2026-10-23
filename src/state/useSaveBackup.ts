import { downloadBackup } from '../model/storage'
import type { PlannerState } from '../model/types'
import { usePlanner, usePlannerDispatch } from './contexts'

/**
 * Downloads a backup file and remembers when. Pass a state to back up
 * something other than what's on screen, like the week that's about to start.
 */
export function useSaveBackup(): (from?: PlannerState) => void {
  const state = usePlanner()
  const dispatch = usePlannerDispatch()
  return (from = state) => {
    const at = new Date().toISOString()
    downloadBackup({ ...from, lastBackupAt: at })
    dispatch({ type: 'backup/saved', at })
  }
}
