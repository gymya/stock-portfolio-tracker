import { test } from "node:test";
import assert from "node:assert/strict";
import * as h3 from "h3";

test("Google OAuth binds state and PKCE, isolates users, rejects CSRF and hides credentials", async () => {
  const origin = "https://stock-portfolio-tracker-bay.vercel.app";
  const config = { googleClientId: "test-client", googleClientSecret: "test-secret-never-expose", googleRedirectUri: `${origin}/api/auth/google/callback` };
  let calls = 0;
  let upstreamError = 0;
  let upstreamMessage = "private upstream detail";
  Object.assign(globalThis, h3, {
    useRuntimeConfig: () => config,
    $fetch: async (url: string, options: { body?: URLSearchParams; headers?: Record<string, string> }) => {
      calls++;
      if (url.includes("/token")) {
        assert.equal(options.body?.get("client_secret"), config.googleClientSecret);
        assert.match(options.body!.get("code_verifier")!, /^[0-9a-f]{64}$/);
        return { access_token: `private-token-${options.body?.get("code")}`, expires_in: 3600 };
      }
      const token = options.headers?.Authorization;
      if (url.includes("/userinfo")) return { sub: token!.slice(-1), email: `${token!.slice(-1)}@example.test` };
      assert.ok(url.startsWith("https://sheets.googleapis.com/v4/spreadsheets/"));
      assert.ok(decodeURIComponent(new URL(url).pathname).endsWith("'交易紀錄'!A1:D10022"));
      if (upstreamError) throw Object.assign(new Error("private upstream detail"), { statusCode: upstreamError, data: { error: { message: upstreamMessage } } });
      return { values: [["交易日期", "股票代號", "交易類型", "股數"], ["2026/11/20", "0050", "買進", token?.endsWith("A") ? 10 : 20]] };
    },
  });
  const routes = await Promise.all([
    import("../server/api/auth/google/start.post.ts"),
    import("../server/api/auth/google/callback.get.ts"),
    import("../server/api/auth/google/status.get.ts"),
    import("../server/api/auth/google/logout.post.ts"),
    import("../server/api/google/holdings.post.ts"),
  ]);
  const app = h3.createApp();
  const router = h3.createRouter();
  router.post("/start", routes[0].default).get("/callback", routes[1].default)
    .get("/status", routes[2].default).post("/logout", routes[3].default).post("/holdings", routes[4].default);
  app.use(router);
  const fetch = h3.toWebHandler(app);
  function browser() {
    let cookie = "";
    return async (path: string, body?: unknown, requestOrigin = origin) => {
      const response = await fetch(new Request(`${origin}${path}`, { method: body === undefined ? "GET" : "POST",
        headers: { Cookie: cookie, Origin: requestOrigin, "X-Portfolio-Request": "1", "Content-Type": "application/json" },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }) }));
      for (const setCookie of response.headers.getSetCookie()) {
        cookie = setCookie.split(";")[0]!;
        assert.ok(!setCookie.includes("private-token"));
        assert.ok(!setCookie.includes(config.googleClientSecret));
        assert.match(setCookie, /HttpOnly/);
        assert.match(setCookie, /Secure/);
        assert.match(setCookie, /SameSite=Lax/i);
      }
      return response;
    };
  }
  const a = browser(), b = browser(), anonymous = browser();
  assert.equal((await anonymous("/holdings", {})).status, 401);
  assert.equal((await a("/start", {}, "https://evil.example")).status, 403);
  assert.equal(calls, 0);
  const startA = new URL((await (await a("/start", {})).json()).url);
  assert.match(startA.searchParams.get("scope")!, /spreadsheets.readonly/);
  assert.equal(startA.searchParams.get("code_challenge_method"), "S256");
  const startB = new URL((await (await b("/start", {})).json()).url);
  assert.equal((await b(`/callback?state=${startA.searchParams.get("state")}&code=A`)).headers.get("location"), "/holdings?google=invalid-state");
  assert.equal(calls, 0);
  for (const [client, start, code] of [[a, startA, "A"], [b, startB, "B"]] as const) {
    assert.equal((await client(`/callback?state=${start.searchParams.get("state")}&code=${code}`)).headers.get("location"), "/holdings?google=connected");
    const status = await client("/status");
    assert.equal(status.headers.get("cache-control"), "no-store");
    const text = await status.text();
    assert.ok(!text.includes("private-token"));
    assert.equal(JSON.parse(text).account.id, code);
  }
  const input = { spreadsheet: "a123456789012345678901234567890" };
  for (const [client, shares] of [[a, 10], [b, 20], [a, 10]] as const) {
    const response = await client("/holdings", input);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.deepEqual((await response.json()).holdings, [{ symbol: "0050", shares }]);
  }
  assert.equal((await a("/holdings", { ...input, spreadsheet: "https://evil.example" })).status, 400);
  upstreamError = 400;
  for (const [message, expected] of [
    ["This operation is not supported for this document", /另存為 Google 試算表/],
    ["Unable to parse range: private worksheet name", /找不到固定的「交易紀錄」工作表/],
    ["private upstream detail", /Google 無法讀取此檔案或範圍/],
  ] as const) {
    upstreamMessage = message;
    const response = await a("/holdings", input);
    assert.equal(response.status, 400);
    const text = await response.text();
    assert.match(text, expected);
    assert.ok(!text.includes(message), "upstream details must stay private");
  }
  upstreamError = 403;
  const denied = await a("/holdings", input);
  assert.equal(denied.status, 403);
  assert.ok(!(await denied.text()).includes("private upstream detail"));
  upstreamError = 401;
  assert.equal((await a("/holdings", input)).status, 401);
  assert.equal((await (await a("/status")).json()).account, null);
  await b("/logout", {});
  assert.equal((await (await b("/status")).json()).account, null);
});
