# P3 Phase D — Shared async timeout boundary

## Scope

Only the timer mechanics shared by `account.js`, `acts-app.js`, and `showcase-dynamic-publish.js` are centralized in `js/async-timeout.js`.

Page-specific responsibilities stay local:

- busy/disabled state
- confirmation dialogs
- success/failure wording
- uncertain write-completion guidance
- Supabase queries and ownership constraints

## Contract

The shared helper provides a 12-second default timeout, rejects with the caller-provided message, and always clears its timer. It does not retry requests automatically.
