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
- **The category is guessed as you type.** The guess comes from keywords like "resume", "deploy", "midterm" or "groceries" and from how you've filed similar lines before. A guessed category has a dashed outline; click J, S, H or P, or type `#j`, `#s`, `#h` or `#p`, to pick a different one.
- **Click any text to change it.** Hover over a line and click **⋯** (or right-click it) to change its category, repeat it every week, send it back to the backlog, or delete it.
- **Put a task on several days** by ticking days under "On these days" in its **⋯** menu. The copies stay linked: renaming one renames them all, and "Repeat every Mon, Wed, Fri" brings the whole set back each week.
- **Drag tasks** between days, or to and from the **Backlog** drawer. Hold **⌥ Option** while you drop to put a copy on that day instead of moving it.
- **Each day stays grouped by category** (J, S, H, P). Drop a task onto a particular spot in a list, guided by the blue line, and it stays exactly there from then on.
- **Give backlog items a due date** from their **⋯** menu. They sort to the top of the backlog and show "due Thu", "due Oct 30" or "overdue", on screen and on paper. It's only a label; nothing moves on its own.
- **Past weeks** shows every wrapped-up week: how much got done in each category, habit streaks, and the page itself with finished items crossed out.

## The Sunday routine

Click **Plan next week** (or **Plan the week** midweek). A step bar walks you through the page one part at a time:

1. **Wrap up:** tick what you crossed off on paper and, if you like, your habit boxes for streaks. Anything unfinished moves to the top of the backlog. Weekly tasks come back on their own, so they don't.
2. **Goals:** check this month's goals. In a new month you can copy last month's.
3. **Every day:** add, change or hide daily tasks. A habit you skip on some days, like weekends, can be set to just those days from its **⋯** menu; the days it's skipped print a dash instead of a box.
4. **Plan days:** the backlog opens beside the page; drag tasks in or type them straight into a day.
5. **Print:** the printout is always US Letter, landscape, on one page. On a busy week the text shrinks a little so it still fits.

Everything saves in your browser as you go, and nothing is sent anywhere. Because clearing your browser data clears the planner too, starting a new week also downloads a backup file (you can turn that off in the wrap-up step), and the **⋯** menu shows when you last backed up. If saved data ever can't be read, the planner sets it aside instead of overwriting it and offers it as a download.

Once you've opened it online, the planner also works without internet.

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
