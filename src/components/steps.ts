import type { SheetFocus } from '../sheet/Sheet'

/** The Sunday routine, in order. */
export const STEPS = [
  { id: 'wrapup', label: 'Wrap up' },
  { id: 'goals', label: 'Goals' },
  { id: 'daily', label: 'Every day' },
  { id: 'days', label: 'Plan days' },
  { id: 'print', label: 'Print' },
] as const

export type Step = (typeof STEPS)[number]['id']

/** The part of the page each step works on. */
export function stepFocus(step: Step | null): SheetFocus | undefined {
  if (step === 'goals' || step === 'daily' || step === 'days') return step
  return undefined
}
