import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const failures = [];
const read = file => fs.readFileSync(path.join(root, file), "utf8");
const assert = (condition, message) => { if (!condition) failures.push(message); };

const client = read("js/supabase-client.js");
const login = read("js/login.js");
const backup = read("js/backup.js");
const deleteFn = read("supabase/functions/delete-account/index.ts");
const adminFn = read("supabase/functions/master-auth-users/index.ts");

assert(!/service[_-]?role/i.test(client), "Browser Supabase client must not contain a service-role credential.");
assert(!/SUPABASE_SERVICE_ROLE_KEY/.test(client), "Service-role environment name must not be referenced by browser client code.");
assert(/candidate\.origin\s*===\s*window\.location\.origin/.test(login), "Login return URL must remain same-origin restricted.");
assert(/candidate\.pathname\.startsWith\(SITE_BASE_PATH\)/.test(login), "Login return URL must remain inside the application base path.");
assert(/MAX_BACKUP_BYTES/.test(backup) && /MAX_CASTS/.test(backup) && /MAX_RELATED_ROWS/.test(backup), "Backup import safety limits are missing.");
assert(/character\.owner_id\s*=\s*user\.id/.test(backup), "Backup restore must force ownership to the authenticated user.");
assert(/character\.visibility\s*=\s*"private"/.test(backup), "Backup restore must force restored casts to private.");
assert(/getUser\(token\)/.test(deleteFn), "Self-delete Edge Function must validate the bearer token with Supabase Auth.");
assert(/SUPABASE_SERVICE_ROLE_KEY/.test(deleteFn), "Self-delete administrative client must obtain service-role from environment.");
assert(/isPrimaryAdmin\(operator\)/.test(adminFn), "Auth administration must remain restricted to the primary administrator.");
assert(/SUPABASE_SERVICE_ROLE_KEY/.test(adminFn), "Auth administration service-role must come from environment.");

if (failures.length) {
  console.error("Security audit failed:");
  failures.forEach(item => console.error(`- ${item}`));
  process.exit(1);
}

console.log("Security audit passed.");
