# Weekly planner

Plan your week on Sunday, print one page, stick it on the fridge, and cross things off with a pen.

The page has three parts:

- **Goals for the month**, printed at the top of every week that month
- **Every day**: tasks you do daily, each with seven tick boxes
- **Day by day**: specific tasks for Monday to Sunday, with blank lines left for adding things by hand

## Running it

```bash
npm install
npm run dev
```

Then open http://localhost:5173 in your browser.

## The Sunday routine

1. Click **Start next week** and tick off whatever you crossed out on paper. Anything unfinished moves to the top of the backlog. Weekly tasks come back on their own, so they don't.
2. Drag tasks from the backlog onto days, or type new ones straight into a day.
3. Click **Print**. The printout is always US Letter, landscape, on one page. On a busy week the text shrinks a little so it still fits.

Everything saves in your browser as you go. Use **Export backup** now and then, because clearing your browser data clears the planner too.

**Safari:** if the printout comes out portrait, set the orientation to landscape in the print dialog. Chrome picks it up automatically.

## Development

```bash
npm test        # unit tests for the week, rollover and date logic
npm run build   # type-check and build for production
npm run lint
```

| Path | What's there |
| --- | --- |
| `src/model/` | Data types, the reducer that every change goes through, date helpers, and browser storage |
| `src/print/` | The printed page and the shrink-to-fit logic |
| `src/components/` | The planning board, goals and routines editors, and the review dialog |
