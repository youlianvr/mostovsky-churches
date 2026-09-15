# Verification contract v2

The project is a no-build vanilla app. The contracts check behavior, not visual polish.

## Focused contract

```bash
node tests/contract.js
```

Covers the 3-object data boundary, the route order (Гудевичи → Лунно → Дубно), the six
mandatory sections of competition block 1 in the wording of the competition document,
ring wraparound, hash parsing including `#/map` and `#/logistika`, both map URL formats
for every object, the shared church icon, the empty cluster list, three single markers,
and the essential home / opis / logistika / spravka / foto / church / 404 views.

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
icons on a three-point route line with no cluster popup, opens a church page from its
marker, verifies both external map links, checks the logistics table, the parish and
source lists, the six empty photo-report slots, the unknown-slug page, and browser
console errors.

The script expects `http://127.0.0.1:8126/index.html`. No test changes application state
beyond normal navigation.
