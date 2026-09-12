# DESIGN-HANDOFF — «Храмы Мостовского района» (Churches of Mostovsky District)

> Self-contained brief for an external AI designer/planner. Everything needed to reason
> about this project is in this file. Read top to bottom; the last two sections tell you
> exactly what to produce and what constraints you must respect.

---

## 1. What this project is

A school history project: a single static website presenting an itinerary of **12 Orthodox
churches** in Mostovsky District (Grodno Region, Belarus). The user walks/reads the route
stop by stop: home page → district map (SVG schema) → church detail pages → back.

- **Audience:** school students, teachers, parents. Presented on a projector and on phones.
- **Language of content:** Russian. The confession scope is deliberately Orthodox-only
  (decision DG8: 7 Catholic kostels were removed from the route; do not reintroduce them).
- **Hosting:** GitHub Pages. **No build step, no frameworks, no external CDNs.**
- **Repo layout (whole project ≈ 1,100 lines of code):**

```
index.html            home: hero, SVG district schema, route list (12 stops)
about.html            "About the project"
css/style.css         ALL styling (585 lines, design tokens on top) — single source of style
js/data.js            ALL content data (12 objects, 399 lines) — editable via GitHub web UI
js/app.js             hash router glue + church page rendering
js/views.js           pure render functions (versioned as views.js?v=8 for cache busting)
js/map.js             SVG schema rendering + cluster popup
js/map-geometry.js    hand-authored district/forest/river/road geometry
img/photos/           7 local photos; 5 stops use styled placeholders (no photo yet)
tests/                3 node contract tests, no framework
```

- **Data model per stop (js/data.js):** slug, name, shortName, settlement, confession
  (`"orthodox"` only), built, status, address, coords (4 of 12 marked approximate),
  photo, photoCredit (mandatory attribution when a photo exists), history[2–3 paragraphs],
  facts[], sources[], routeStep (1–12), placeholder flag.

## 2. Route & map structure

The route is a **ring starting and ending in Mosty town**:

| # | Stop | Settlement |
|---|------|-----------|
| 1 | Храм иконы Божией Матери «Всех скорбящих Радость» (1994–95) | г. Мосты |
| 2 | Свято-Ильинская кладбищенская церковь (1910) | г. Мосты |
| 3 | Церковь Рождества Иоанна Предтечи | д. Лунно |
| 4 | Церковь Рождества Пресвятой Богородицы | д. Черлёна |
| 5 | Церковь Святителя Николая Чудотворца | д. Дубно |
| 6 | Церковь Рождества Пресвятой Богородицы | д. Гудевичи |
| 7 | Свято-Покровская церковь | д. Белавичи |
| 8 | Церковь Рождества Пресвятой Богородицы | д. Пацевичи |
| 9 | Церковь Святителя Николая Чудотворца | д. Самуйловичи Дольные |
| 10 | Церковь Святителя Николая Чудотворца | д. Пески |
| 11 | Храм Святой Живоначальной Троицы (2022, newest) | д. Куриловичи |
| 12 | Храм преподобной Софии Слуцкой | г. Мосты |

Stops 1–3 form the **Mosty cluster** (3 temples in town): on the map it is one enlarged
marker "1 · Мосты · 3 храма" that opens an in-page **cluster popup** listing the three
churches (an overlay panel below the map, not a modal). Stops 4–11 are singles; stop 12
back in Mosty closes the ring.

The SVG schema (min-width 720px, horizontally scrollable on mobile) shows: district
outline, forests, the Neman river, dashed roads, a dashed ochre **route line** connecting
markers in ring order, numbered circle markers (green = orthodox) with settlement labels.

## 3. Design system (current, css/style.css)

**Style direction:** local-history / краеведческий "parchment" look — warm paper tones,
deep green + ochre accents, serif typography throughout. Deliberately modest, print-like,
trustworthy. NOT a startup aesthetic.

```css
/* Palette */
--color-bg: #f5efdf;          /* parchment page background */
--color-bg-soft: #ece2c8;     /* darker parchment block background */
--color-card: #fffdf5;        /* warm white cards */
--color-green: #2f4a32;       /* primary accent (header bg, buttons, markers) */
--color-green-deep: #223824;  /* headings / dark green text */
--color-ochre: #b58a4a;       /* accents, lines, map route, focus ring */
--color-ochre-deep: #8a6530;  /* hover accent */
--color-ink: #2b2b2b;         /* body text */
--color-muted: #6b6253;       /* secondary text */
--color-line: #d8cbab;        /* borders/dividers */

/* Typography: Georgia serif everywhere (projector readability) */
--fs-hero: clamp(1.9rem, 4.5vw, 3rem);
--fs-h1: clamp(1.6rem, 3vw, 2.4rem);
--fs-h2: clamp(1.25rem, 2vw, 1.6rem);
--fs-body: 1.06rem;  /* 1.12rem ≥1200px */
--fs-small: 0.88rem;
line-height: 1.65 (1.7 ≥1200px)

/* Space & shape */
--space-xs..xl: 0.35 / 0.7 / 1.25 / 2 / 3rem;
--radius: 6px;
--container-max: 1100px;
```

**Component inventory:** navbar (green bar, ochre bottom border) · hero with eyebrow +
"start here" guide box · SVG map schema + legend · route list (cards with 4px ochre left
accent = route-line motif) · `.btn` solid green / `.btn-ghost` · fact panel (dl grid) ·
photo figure with caption & CC attribution · photo placeholder (italic, 220px min) ·
breadcrumbs · prev/next route navigation (`.route-nav`) · cluster popup (card + shadow,
36px close button) · footer (deep green, sources list).

**Accessibility already in place:** `:focus-visible` ochre outline, `prefers-reduced-motion`,
full-page landmarks (nav/main/footer), all images have alt, map markers are focusable
links with aria-labels, 24px+ touch targets (footer links padded, map markers use
`pointer-events: bounding-box`), body text contrast 4.59:1.

## 4. Design decisions already made (do not relitigate)

- **DG4:** mosty cluster = enlarged single marker + inline popup (not 3 overlapping pins).
- **DG5:** approximate coordinates are shown with a visible "point to be refined" note —
  honesty over fake precision.
- **DG7:** missing photos get styled placeholders, not stock images or broken images.
- **DG8:** Orthodox-only route (Catholic kostels removed from the itinerary; 7 photos
  archived). A historical note "before 1839 — Greek-Catholic" inside one church's history
  text stays — it is a fact, not a confession label.
- One confessional marker style on the map (green circle); the multi-confession legend
  was removed with the kostels.
- Inline styles are forbidden; `css/style.css` is the single style source.
- Attribution (CC BY-SA) must always accompany photos — legal requirement.

## 5. Current UX flows

1. **Home:** hero ("Historical itinerary · 12 stops") → guide box ("pick a number on the
   schema or open a stop below") → SVG schema (markers are links; cluster opens popup) →
   route list (12 cards: number, name, settlement, "Open" button).
2. **Church page (`#/slug`):** breadcrumbs → title + subtitle (settlement · orthodox
   church · built years) → photo/attribution or placeholder → fact panel (built, status,
   address, capacity…) → history paragraphs → facts list → sources → prev/next route
   navigation → external links (Osm/Google maps coordinates).
3. **About page:** project story, data-editing instructions for the teacher, sources.

## 6. Verification & history (so you know what was already fixed)

Two contract tests run with plain `node tests/*.js` — both green:
`contract v2` (12 objects, ring route integrity, cluster membership, no broken slugs) and
`content contract v1` (4 approximate coords, 5 photo placeholders flagged, sources present).

Completed passes: content restructure (kostel removal, DG8), technical a11y audit
(focus-visible, reduced-motion, touch targets, marker hit areas), a "slop detector" pass
that de-duplicated three identical left-accent borders (route list kept the accent as the
route-line motif; guide box → full border; popup → shadow). Verified live in a browser:
home, schema, cluster popup, church page, zero console errors.

## 7. Known gaps / open improvement directions

**Visual & interaction (highest value):**
1. No photos for 5 of 12 stops — placeholders look bare; a better placeholder treatment
   (dedicated illustration, map excerpt, or "photo wanted" card) is wanted.
2. No hover/press loading/active states beyond color on `.btn`; no motion design at all
   (acceptable: `prefers-reduced-motion` is respected; everything new must respect it too).
3. Map ↔ list are not synchronized: clicking a list item does not highlight/scroll to its
   map marker and vice versa.
4. Cluster popup is plain; no entrance transition, no focus trap/return (focus handling is
   untested).
5. Map schema on mobile is a horizontal scroll strip — workable but unloved; no zoom or
   pinch support (constraint: no external JS libraries).

**Content presentation:**
6. Fact panel is a flat dl; the detail page is a long single column — could use a stronger
   two-column (photo+facts / history) composition on wide screens with the projector in mind.
7. Hero is text-only; the project has zero imagery on the landing layer.
8. Typography is one serif family at 4 sizes; a display accent (small caps, drop caps,
   section numbering as a visual motif "1–12") is unexplored.

**Process constraints (hard):**
- Pure HTML/CSS/JS, no build, no CDN, no frameworks. Any new asset must live in the repo.
- Content is edited by a non-technical teacher through GitHub web UI in `js/data.js` —
  the data file format must stay simple.
- Russian content; serif, projector-friendly; parchment aesthetic is the brand.
- All photos need CC attribution; placeholders must be honest (no fake photos).

## 8. What to produce (your task)

1. **Critique** of the current design per the flows in §5 and heuristics (Nielsen 10 +
   WCAG 2.2 AA), using §3 tokens as-is — flag only real problems, rank by impact.
2. **An improvement plan** (prioritized, effort-vs-impact) respecting §4 and §7
   constraints. Group into: quick wins / structural CSS changes / new interactions.
3. For each proposal: the target component, the token/CSS-level change sketch, and how it
   would be verified (the project has node contract tests and can be screenshotted).
4. Do NOT propose: new frameworks, external fonts/CDNs, dark mode (school projector use
   makes light mandatory for now), re-adding other confessions, or fake photo assets.

## 9. Tone

A modest, warm, "museum label" aesthetic. Improvements should make it feel more
*authored* — a crafted local-history exhibit — not more like a SaaS template. When in
doubt, prefer the quieter option.
