// A logged-in showcase generator without Supabase: a fake session in localStorage and fixed answers for the REST/RPC calls
// the generator makes. Every RPC call is recorded so a test can check what a click published.
// (docs/TESTING_STRATEGY.md section 8 describes the same idea for the visual tests.)

const SUPABASE_ORIGIN = "https://koprmbkoftuuffslhsvt.supabase.co";
const AUTH_STORAGE_KEY = "sb-koprmbkoftuuffslhsvt-auth-token";
const ONE_PIXEL_PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "base64");
export const MOCK_USER_ID = "11111111-1111-4111-8111-111111111111";
const USER_ID = MOCK_USER_ID;

function castRow(index, overrides = {}) {
  const id = `00000000-0000-4000-8000-00000000000${index}`;
  return {
    id,
    public_id: `TNX-MOCK00${index}`,
    owner_id: USER_ID,
    player_name: `PLAYER ${index}`,
    character_name: `テストキャスト${index}`,
    character_kana: `テストキャスト${index}`,
    handle: `ハンドル${index}`,
    handle_kana: "",
    affiliation: "N◎VA市政調査局",
    citizen_rank: "B",
    style_1: "カタナ", style_1_mark: "◎",
    style_2: "カゼ", style_2_mark: "●",
    style_3: "ニューロ", style_3_mark: "",
    image_url: "",
    image_thumbnail_url: "",
    summary: `「テスト${index}の一言」から始まる概要。`,
    age: "24",
    gender: "女性",
    visibility: "public",
    updated_at: "2026-08-25T00:00:00.000Z",
    ...overrides
  };
}

// The paths the page asked Storage to remove, in order (the DELETE body is { prefixes: [...] }).
export function removedStoragePaths(calls) {
  return calls.storageRemovals.flatMap(body => { try { return JSON.parse(body).prefixes ?? []; } catch { return []; } });
}

export const MOCK_PUBLIC_CASTS = Object.freeze([1, 2, 3, 4].map(index => Object.freeze(castRow(index))));
export const MOCK_PRIVATE_CASTS = Object.freeze([Object.freeze(castRow(9, { visibility: "private" }))]);

function fakeJwt() {
  const encode = value => Buffer.from(JSON.stringify(value)).toString("base64url");
  return `${encode({ alg: "HS256", typ: "JWT" })}.${encode({ sub: USER_ID, aud: "authenticated", role: "authenticated", exp: 4102444800 })}.mock`;
}

// Returns { rpcCalls, restCalls, storageUploads }. `options.rpc` maps an RPC name to its answer (default null); `options.rpcFailures` maps an RPC name to an error message (the call then answers 400).
export async function installShowcaseGeneratorMock(page, options = {}) {
  const calls = { rpcCalls: [], restCalls: [], storageUploads: [], storageRemovals: [] };
  const user = { id: USER_ID, email: "mock@example.invalid", aud: "authenticated", role: "authenticated" };
  await page.addInitScript(({ key, session }) => {
    localStorage.setItem(key, JSON.stringify(session));
    localStorage.setItem("tnx-cast-site-theme", "nova");
  }, {
    key: AUTH_STORAGE_KEY,
    session: { access_token: fakeJwt(), refresh_token: "mock-refresh", expires_in: 3600, expires_at: 4102444800, token_type: "bearer", user }
  });

  const publicCasts = options.publicCasts ?? MOCK_PUBLIC_CASTS;
  const privateCasts = options.privateCasts ?? MOCK_PRIVATE_CASTS;
  const ownedActs = options.ownedActs ?? [];
  const rpcAnswers = options.rpc ?? {};

  await page.route(`${SUPABASE_ORIGIN}/**`, async route => {
    const request = route.request();
    const url = new URL(request.url());
    const wantsObject = (request.headers().accept || "").includes("pgrst.object");
    const json = (status, body) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });

    if (request.method() === "OPTIONS") return route.fulfill({ status: 204, body: "" });
    if (url.pathname === "/auth/v1/user") return json(200, user);
    if (url.pathname.startsWith("/rest/v1/rpc/")) {
      const name = url.pathname.slice("/rest/v1/rpc/".length);
      let body = null;
      try { body = request.postDataJSON(); } catch { /* no body */ }
      calls.rpcCalls.push({ name, body });
      if (options.rpcFailures && name in options.rpcFailures) return json(400, { message: options.rpcFailures[name] });
      const answer = name in rpcAnswers ? rpcAnswers[name] : null;
      return json(200, typeof answer === "function" ? answer(body) : answer);
    }
    if (url.pathname.startsWith("/storage/v1/object/public/") && request.method() === "GET") {
      return route.fulfill({ status: 200, contentType: "image/png", body: ONE_PIXEL_PNG });
    }
    if (url.pathname.startsWith("/storage/v1/object/")) {
      if (request.method() === "POST") {
        calls.storageUploads.push(decodeURIComponent(url.pathname.replace("/storage/v1/object/", "")));
        return json(200, { Key: "mock" });
      }
      if (request.method() === "DELETE") {
        calls.storageRemovals.push(request.postData() || "");
        return json(200, []);
      }
    }
    if (url.pathname === "/rest/v1/characters") {
      calls.restCalls.push(`characters ${url.search}`);
      const visibility = url.searchParams.get("visibility");
      if (url.searchParams.has("id")) {
        const row = [...publicCasts, ...privateCasts].find(item => url.searchParams.get("id") === `eq.${item.id}`);
        return json(200, wantsObject ? (row ?? null) : row ? [row] : []);
      }
      if (visibility === "eq.public") return json(200, publicCasts);
      if (visibility === "eq.private") return json(200, privateCasts);
      return json(200, []);
    }
    if (url.pathname === "/rest/v1/acts") return json(200, ownedActs);
    if (request.method() === "GET") return json(200, wantsObject ? null : []);
    return json(405, { message: `Unhandled mock route: ${request.method()} ${url.pathname}` });
  });
  return calls;
}
