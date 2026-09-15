# Verification contract v3

The project is a no-build vanilla app. The contracts check behavior, not visual polish.

## Focused contract

```bash
node tests/contract.js
```

Reads the module list from `index.html` and executes those scripts in the page's own
order, so a page that loads the wrong files fails the test. Covers: one implementation
(`js/dom.js` is the only writer of `#app`, no page loads a removed file), the six mandatory
elements of competition block 1 in the wording of the competition document, the navbar
links to them, the 3-object boundary (Гудевичи → Лунно → Дубно, no removed object left in
the data), dispatch of every URL state through the router, ring wraparound, hash parsing,
the church icon on the schema and in the legend, the marker → church page links, the appeal
line of every object, distances from the regional and district centre with all three travel
modes, parish contacts and places to eat, the photo-report slots (empty before the trip,
filled from a data row), both map URL formats for every object, the church page with its
locator, and the 404 state including the tab title. It also checks that the data integrity
rule reports a wrong `routeStep` against the object found by slug.

## Content contract

```bash
node tests/content-completeness.js
```

Checks every stop for identity, facts, at least two paragraphs of history, three or more
facts, sources, the appeal line («обоснование привлекательности»), distances from both
Grodno and Mosty, parish contacts and service times, food note, photo attribution with a
direct link, and the `visitPhotos` array for the personal photo report.

## Live browser smoke

Start a static server from the project directory, then run:

```bash
node tests/browser-smoke.js
```

Needs playwright, which is not vendored in the repository:

```bash
npm i --no-save playwright && npx playwright install chromium
```

The smoke script walks all six sections by URL, checks that the map draws three church
icons on a three-point route line, opens a church page from its marker, verifies both
external map links, checks the logistics table, the parish and source lists, the six empty
photo-report slots, the unknown-slug page, and browser console errors.

The script expects `http://127.0.0.1:8126/index.html`. No test changes application state
beyond normal navigation.
