/*
 * Retired compatibility shim.
 *
 * Older editor builds forced an empty style-skill row whenever the list became
 * empty. That behavior is no longer desirable: zero style skills is a valid
 * editor state, and users can add a row explicitly with #add-style-skill.
 *
 * Keep this file temporarily because sheet.html still references it. It must
 * not install timers, observers, or synthetic button clicks.
 */
