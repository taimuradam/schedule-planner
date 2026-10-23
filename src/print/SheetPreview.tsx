import { useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { PrintSheet, type SheetData } from './PrintSheet'
import { useFitToPage } from './useFitToPage'

// US Letter landscape at the CSS reference 96px per inch.
const PAPER_WIDTH = 11 * 96
const PAPER_HEIGHT = 8.5 * 96

/**
 * Shows the sheet as a scaled-down sheet of paper, and keeps a full-size copy
 * outside the app that only appears when printing. Both copies use the scale
 * measured here, so the paper matches the preview.
 */
export function SheetPreview({ data }: { data: SheetData }) {
  const frameRef = useRef<HTMLDivElement>(null)
  const sheetRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(0.6)
  const { fit, clipped } = useFitToPage(sheetRef, data)

  useLayoutEffect(() => {
    const frame = frameRef.current
    if (!frame) return
    const update = () => setScale(frame.clientWidth / PAPER_WIDTH)
    update()
    const observer = new ResizeObserver(update)
    observer.observe(frame)
    return () => observer.disconnect()
  }, [])

  return (
    <>
      <div className="preview-frame" ref={frameRef} style={{ height: PAPER_HEIGHT * scale }}>
        <div className="preview-paper" style={{ transform: `scale(${scale})` }}>
          <PrintSheet data={data} fit={fit} ref={sheetRef} />
        </div>
      </div>
      {clipped ? (
        <p className="preview-note preview-note-warning">
          This week doesn't fit on one page even at the smallest text size, so the bottom of some days
          will be cut off. Move a few tasks to the backlog or a quieter day.
        </p>
      ) : (
        fit < 1 && (
          <p className="preview-note">Text is shrunk to {Math.round(fit * 100)}% so the week fits on one page.</p>
        )
      )}
      {createPortal(
        <div className="print-only">
          <PrintSheet data={data} fit={fit} />
        </div>,
        document.body,
      )}
    </>
  )
}
