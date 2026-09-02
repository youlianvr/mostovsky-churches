# Verification contract v1

The project is a no-build vanilla app. The contract checks behavior, not visual polish.

## Focused contract

```bash
node tests/contract.js
```

It covers the 12-object data boundary, unique route order, ring wraparound, hash parsing including `#/map`, unknown slugs, both map URL formats for every object, the Мосты cluster, 9 single markers, and the essential home/church/404 views.

## Live browser smoke

Start a static server from the project directory, then run:

```bash
node tests/browser-smoke.js
```

The smoke script checks `#/map`, the 12-point line, cluster/single counts, opening the Мосты cluster, navigating to a church page, preserving both map buttons, the unknown-slug page, and browser console errors.

The script expects `http://127.0.0.1:8126/index.html`. No test changes application state beyond normal navigation.
