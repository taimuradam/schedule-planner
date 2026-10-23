import { useEffect, useLayoutEffect, useState, type RefObject } from 'react'

const MIN_FIT = 0.6
const STEP = 0.025

function overflows(sheet: HTMLElement): boolean {
  if (sheet.scrollHeight > sheet.clientHeight + 1) return true
  return Array.from(sheet.querySelectorAll<HTMLElement>('[data-fit]')).some(
    (el) => el.scrollHeight > el.clientHeight + 1,
  )
}

/**
 * Finds the largest type scale at which the sheet fits on one page, by
 * stepping `--fit` down until nothing overflows. `clipped` means even the
 * smallest scale isn't enough and some of the week would be cut off.
 */
export function useFitToPage(ref: RefObject<HTMLElement | null>, content: unknown) {
  const [result, setResult] = useState({ fit: 1, clipped: false })
  const [fontsReady, setFontsReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    document.fonts.ready.then(() => !cancelled && setFontsReady(true))
    return () => {
      cancelled = true
    }
  }, [])

  useLayoutEffect(() => {
    const sheet = ref.current
    if (!sheet) return
    let fit = 1
    sheet.style.setProperty('--fit', String(fit))
    while (fit > MIN_FIT && overflows(sheet)) {
      fit = Math.round((fit - STEP) * 1000) / 1000
      sheet.style.setProperty('--fit', String(fit))
    }
    const clipped = overflows(sheet)
    setResult((prev) => (prev.fit === fit && prev.clipped === clipped ? prev : { fit, clipped }))
  }, [ref, content, fontsReady])

  return result
}
