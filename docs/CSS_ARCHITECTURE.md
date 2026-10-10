# CSS architecture

## Loading contract

Every theme-enabled page owns exactly two stylesheet links:

1. One application or page entry stylesheet.
2. `css-next/themes/index.css`, always last.

Every screen loads one `css-next/pages/*-entry.css` file. An entry imports the common-only `index.css` and its feature/page styles into named cascade layers, so priority is declared in CSS instead of being inferred from HTML link order.

`css-next/index.css` contains only tokens, foundations, shared layout, and reusable primitives. It must not import `editor/`, `pages/`, or feature-only component stylesheets.

## Directory ownership

| Directory | Responsibility |
|---|---|
| `tokens/` | Shared measurements and semantic color variables |
| `foundation/` | Reset, document defaults, typography |
| `layout/` | Application shell and page geometry |
| `components/` | Reusable controls, panels, tables and dialogs |
| `editor/` | PC editor-only components |
| `pages/` | Page-specific composition and entry stylesheets |
| `themes/` | Theme tokens and concrete `data-theme` selectors |

## Shared patterns

- `layout/app-shell.css` owns the admin screen header `.page-header` (with `.app-header__title` and `.app-header__aside`).
  Page stylesheets must not restate its size or placement; they keep only what is unique to the screen.
- `components/disclosure-chevron.css` owns the fold indicator for `.data-panel__header` (cast view) and `.section-toggle` (editor).
  Screens only set its colour through `--chevron-color`. Which screens use each pattern: `docs/UI_CONVENTIONS.md`.

## Cascade rules

- Do not use `!important` in application CSS.
- Do not create `<style>` or stylesheet `<link>` elements from JavaScript.
- Put reusable presentation in `components/`; JavaScript owns state and markup only.
- Use a named page layer when later presentation must override common styles.
- Keep responsive variants in the same file and media-query context as their owner.
- Give every theme-enabled HTML screen a page entry, including redirects and small reference screens.
- Concrete theme selectors belong only in `themes/`.
- Page styles consume semantic tokens and theme scopes instead of identifying themes.

## Verification

`npm run audit:css` rejects `!important`, same-context duplicate selectors (checked per original source inside the bundled ACT SHOWCASE stylesheets), runtime CSS generation, inline production styles, page/feature imports in the common entry, legacy stylesheets, invalid page entry chains, and incorrect final theme ordering.

`npm run audit:themes` separately validates the registry, theme manifests, token coverage and semantic application scopes. Both audits are part of `npm run verify`.
