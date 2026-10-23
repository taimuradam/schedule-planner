import { useRef } from 'react'
import { createPortal } from 'react-dom'
import { Sheet, type SheetData, type SheetFocus } from './Sheet'
import { useFitToPage } from './useFitToPage'

/**
 * The page you edit, plus a full-size print copy kept off screen. The copy is
 * what gets measured for fit and what actually prints, and the editable page
 * uses the same text scale, so the screen matches the paper.
 */
export function PageEditor({ data, focus }: { data: SheetData; focus?: SheetFocus }) {
  const printRef = useRef<HTMLDivElement>(null)
  const { fit, clipped } = useFitToPage(printRef, data)

  return (
    <>
      <div className="page-frame">
        <div className="page-paper">
          <Sheet data={data} fit={fit} editing focus={focus} />
        </div>
      </div>
      {clipped ? (
        <p className="page-note page-note-warning">
          This week doesn't fit on one page even at the smallest text size, so the bottom of some days will be cut off
          when printed. Move a few tasks to the backlog or a quieter day.
        </p>
      ) : (
        fit < 1 && <p className="page-note">Text is shrunk to {Math.round(fit * 100)}% so the week fits on one page.</p>
      )}
      {createPortal(
        <div className="print-copy" aria-hidden="true">
          <Sheet data={data} fit={fit} ref={printRef} />
        </div>,
        document.body,
      )}
    </>
  )
}
