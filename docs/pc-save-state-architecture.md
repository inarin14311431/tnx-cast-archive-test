# PC editor save-state ownership

The classic PC editor separates editor capture, payload serialization, persistence, save orchestration, and save-state presentation.

`js/sheet-save-coordinator.js` owns producer-side save lifecycle mechanics:

- dirty / saving / pending state;
- a monotonic edit revision used to distinguish the snapshot currently being persisted from edits made while that request is in flight;
- queued follow-up save handling when the editor changes during an active save;
- suppression of redundant persistence calls when a queued request reaches an already-clean editor;
- validation gating;
- publishing explicit `unsaved`, `saving`, `saved`, and `error` transitions through `sheet-save-state.js`;
- publishing the raw failed save error through `tnx:sheet-save-error` before the public error-state transition;
- registering the canonical save command used by shared consumers.

An edit made while a save request is running must never be cleared by completion of the older request. `markDirty()` advances the revision and queues a follow-up save; the active save only clears dirty state when no newer revision exists.

`js/sheet-save-payload.js` owns the DB-shaped serialization contract for the classic editor:

- character base/profile/style/divine fields;
- ability value, growth, gear, manual-zero, control value, and CS mapping;
- skill row filtering, suit booleans, free-level clamping, style-separator serialization, and sort order;
- category-owned outfit base fields, including control only for armor/vehicle and CS modifier only for tron/vehicle;
- no legacy combined defense or retired mundane modifier emission.

The payload module is DOM-free. `sheet.js` reads the editor state and supplies a plain snapshot to this serializer rather than owning DB field mapping itself.

`js/sheet-save-persistence.js` owns the transactional database save boundary:

- the `save_character_bundle_with_ofc` RPC name;
- explicit OFC enrichment through `enrichOutfitPayload()` before the RPC call;
- the exact `p_character_id / p_character / p_skills / p_outfits` argument mapping;
- propagation of Supabase RPC errors;
- validation that the returned bundle contains both `id` and `public_id`.

`js/outfit-ofc-save.js` is now an explicit outfit enrichment adapter. It no longer imports the Supabase client or monkey-patches `supabase.rpc`.

`js/sheet.js` owns editor interaction and capture plus post-save editor integration. Its `collectCharacter()`, `collectSkills()`, and `collectOutfits()` functions gather current editor state and delegate DB-shaped serialization to `sheet-save-payload.js`. The persistence callback then calls `persistSheetBundle()`, updates the current character/public ID, rewrites the editor URL, and publishes `tnx:character-saved`.

`js/sheet-save-state.js` is the single presentation/consumer bridge for save state.

Responsibilities:

- hold the explicit current state and status text;
- render `#save-status` and the matching `#save-button` state and label from that state;
- publish `tnx:sheet-save-state` when the state changes;
- expose `TNXSheetSaveState` plus module helpers for consumers that need to query dirty state, request a save, wait for completion, or focus the save button;
- route `requestSheetSave()` through the save requester registered by the coordinator instead of synthesizing a click on `#save-button`.

Consumers must not parse `#save-status` text/classes, click the save button as a command transport, or duplicate the save-button presentation mapping.

Current consumers:

- `sheet-snapshots.js` uses the shared bridge for its unsaved guard and save-button focus.
- `sheet-image.js` uses `requestSheetSave()` + `waitForSheetSaved()` while bootstrapping the first save before image upload. The request reaches the coordinator directly rather than depending on button DOM.
- `sheet-save-diagnostics.js` listens to `tnx:sheet-save-state` for lifecycle and `tnx:sheet-save-error` for the structured DB error. It does not observe `#save-status`, import the Supabase client, or monkey-patch `supabase.rpc`.
- `sheet-features.js` has no independent save-state observer.

The former `sheet-save-watchdog.js` has been removed from the repository. Its historic autosave timer interception, timer monkey-patching, duplicate unsaved-state parser, and duplicate `beforeunload` listener are retired.

Current ownership boundary:

- `sheet.js`: editor DOM/state capture and post-save URL/event integration;
- `sheet-save-payload.js`: canonical DB-shaped character/skill/outfit serialization;
- `sheet-save-coordinator.js`: save lifecycle state, edit-revision tracking, queued save mechanics, structured failure publication, and canonical save-command registration;
- `sheet-save-persistence.js`: transactional RPC persistence and explicit OFC enrichment;
- `outfit-ofc-save.js`: OFC detail enrichment only;
- `sheet-save-state.js`: explicit state store, presentation, and consumer API;
- `sheet-save-diagnostics.js`: diagnostic interpretation only, with no persistence interception.

The next safe cleanup is a final ownership audit of `sheet.js` and the surrounding compatibility tests. That audit should remove stale save-era assumptions without moving editor rendering or interaction logic into the persistence/payload layers.
