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

## Using it

The screen shows the page exactly as it will print. You edit right on it:

- **Click any blank line to write on it.** Press Enter to save and start the next line, or Escape to stop.
- **The category is guessed as you type.** The guess comes from keywords like "resume", "deploy" or "midterm" and from how you've filed similar lines before. A guessed category has a dashed outline; click J, S or H, or type `#j`, `#s` or `#h`, to pick a different one.
- **Click any text to change it.** Hover over a line and click **⋯** (or right-click it) to change its category, repeat it every week, send it back to the backlog, or delete it.
- **Put a task on several days** by ticking days under "On these days" in its **⋯** menu. The copies stay linked: renaming one renames them all, and "Repeat every Mon, Wed, Fri" brings the whole set back each week.
- **Drag tasks** between days, or to and from the **Backlog** drawer. Hold **⌥ Option** while you drop to put a copy on that day instead of moving it.

## The Sunday routine

Click **Plan next week** (or **Plan the week** midweek). A step bar walks you through the page one part at a time:

1. **Wrap up:** tick what you crossed off on paper. Anything unfinished moves to the top of the backlog. Weekly tasks come back on their own, so they don't.
2. **Goals:** check this month's goals. In a new month you can copy last month's.
3. **Every day:** add, change or hide daily tasks.
4. **Plan days:** the backlog opens beside the page; drag tasks in or type them straight into a day.
5. **Print:** the printout is always US Letter, landscape, on one page. On a busy week the text shrinks a little so it still fits.

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
| `src/sheet/` | The page: one component that is both the printout and the on-screen editor, plus shrink-to-fit |
| `src/editor/` | The line editor with category chips and `#` tags, and the "⋯" menus |
| `src/components/` | The Sunday step bar, the backlog drawer, and shared buttons and icons |
