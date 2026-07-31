# SCP Reading Atlas — design system

## Product position

This is a cross-branch reading instrument, not a checklist dashboard. Its primary job is to help a reader choose the next article, leave for the source wiki, and return without losing the read/rate/memo flow.

- Audience: readers moving among the 16 SCP branches, translations, tales, hubs, and special series.
- Tone: technical, austere, quietly ominous.
- Genre: modern-minimal.
- Structural fingerprint: Ecosystem Index for Home; Workbench + Index-First for discovery and article lists; Stat-Led for progress.
- Navigation: N13 visible command search combined with an N3 compact desktop rail; five-item mobile bottom navigation.
- Product invariant: external reading never destroys in-app context. The Reading Dock remains available with source links and capture controls.

## Interaction model

1. Home answers “what should I read next?” before exposing the full catalog.
2. Find exposes global search and a branch browser; branch identity is data, not decorative colour.
3. Article lists keep layout and reading-state filters visible; sorting, bulk changes, direct jump, random selection, and detailed filters live behind one secondary “操作” disclosure.
4. Opening an external article creates a Reading Dock session. Read state, rating, memo, queue, JP/original, and return context stay together.
5. Saved combines favorites, queue, and memos through consistent article-row semantics.
6. Progress explains totals, goals, streaks, and branch drill-down without nested cards.

## Visual language

- Archival amber is the only brand accent and stays below roughly five percent of a viewport.
- Warm charcoal/paper neutrals carry hierarchy. Branch colours are limited to thin progress markers and never carry text.
- Geist is used for interface and Japanese fallback text. Geist Mono is reserved for SCP designations, counts, shortcuts, and compact metadata.
- Surfaces are separated by rules and tonal shifts; shadows are reserved for drawers, dialogs, and the Reading Dock.
- Corners are restrained (8–16 px). Pills are used only for compact filters/statuses.
- Motion is 140–220 ms, transform/opacity/background/border only, and completely reduced for `prefers-reduced-motion`.

## Accessibility contract

- Body copy is 16 px with a 1.65 line-height; muted colours still meet body-text contrast.
- All controls expose default, hover, focus-visible, active, and disabled states.
- Touch controls are at least 44 px on coarse pointers.
- Every view owns an `h1`; route changes update document title and focus the view heading.
- The mobile drawer is inert and `aria-hidden` while closed, traps focus while open, closes on Escape, and returns focus.
- Dialog search uses combobox/listbox semantics and restores focus.
- `html` and `body` use `overflow-x: clip`; clickable labels never wrap.

## Exports

### CSS token export

The canonical runtime export is [`tokens.css`](tokens.css). Components may consume only semantic names such as `--color-paper`, `--color-ink`, and `--color-accent`; raw colour and font values belong only in the token file.

### Tailwind v4 export

```css
@theme {
  --color-background: var(--color-paper);
  --color-surface: var(--color-paper-2);
  --color-surface-raised: var(--color-paper-3);
  --color-foreground: var(--color-ink);
  --color-muted-foreground: var(--color-muted);
  --color-border: var(--color-rule);
  --color-primary: var(--color-accent);
  --color-primary-foreground: var(--color-accent-ink);
  --color-ring: var(--color-focus);
  --font-sans: var(--font-body);
  --font-mono: var(--font-mono);
  --radius-sm: var(--radius-sm);
  --radius-md: var(--radius-md);
  --radius-lg: var(--radius-lg);
}
```

### DTCG export

The portable Design Tokens Community Group export is [`tokens.json`](tokens.json). Dark mode values are the portable default; light mode overrides remain in `tokens.css` because the current app consumes CSS custom properties directly.

### shadcn/ui variable export

```css
:root {
  --background: var(--color-paper);
  --foreground: var(--color-ink);
  --card: var(--color-paper-2);
  --card-foreground: var(--color-ink);
  --popover: var(--color-paper-elevated);
  --popover-foreground: var(--color-ink);
  --primary: var(--color-accent);
  --primary-foreground: var(--color-accent-ink);
  --secondary: var(--color-paper-3);
  --secondary-foreground: var(--color-ink-2);
  --muted: var(--color-paper-3);
  --muted-foreground: var(--color-muted);
  --accent: var(--color-accent);
  --accent-foreground: var(--color-accent-ink);
  --destructive: var(--color-danger);
  --destructive-foreground: var(--color-accent-ink);
  --border: var(--color-rule);
  --input: var(--color-rule-strong);
  --ring: var(--color-focus);
  --radius: var(--radius-md);
}
```

## Page recipes

- Home: lead with continuation/queue/goal, then recent activity, then a compact branch ecosystem index.
- Search: persistent labeled query field, result count and scope, dense semantic rows.
- Branch/series: branch and series title, reading progress, common filters, then the article index.
- Favorites/queue/memos: use the same row grammar and external-open behavior as series lists.
- Stats: one lead percentage paired with a worded heading, then branch rows and history; every numeric claim comes from stored user data.
- Mobile: content first, five-item bottom nav, branch chooser as drawer, Reading Dock above the nav.
