import { googleConfig, googleSession } from "../../../utils/googleSession.ts";

export default defineEventHandler(async event => {
  const config = googleConfig(event);
  const session = await googleSession(event);
  const { state, code, error } = getQuery(event);
  const saved = session.data;
  if (typeof state !== "string" || !saved.state || state !== saved.state ||
      !saved.startedAt || Date.now() - saved.startedAt > 600000 || !saved.verifier) {
    return sendRedirect(event, "/holdings?google=invalid-state");
  }
  await session.clear();
  if (error || typeof code !== "string") return sendRedirect(event, "/holdings?google=denied");
  try {
    const token = await $fetch<{ access_token: string; expires_in: number }>("https://oauth2.googleapis.com/token", {
      method: "POST",
      body: new URLSearchParams({ code, client_id: config.googleClientId, client_secret: config.googleClientSecret,
        redirect_uri: config.googleRedirectUri, grant_type: "authorization_code", code_verifier: saved.verifier }),
      timeout: 12000, retry: 0,
    });
    if (!token.access_token || !Number.isFinite(token.expires_in) || token.expires_in <= 0) throw new Error("Invalid token");
    const user = await $fetch<{ sub: string; email: string }>("https://openidconnect.googleapis.com/v1/userinfo", {
      headers: { Authorization: `Bearer ${token.access_token}` }, timeout: 12000, retry: 0,
    });
    if (!user.sub || !user.email) throw new Error("Missing account identity");
    // shortcut: one-hour connection without refresh tokens; add durable sessions if background sync is needed.
    await session.update({ accessToken: token.access_token, accountId: user.sub, email: user.email,
      expiresAt: Date.now() + Math.min(token.expires_in, 3600) * 1000 });
    return sendRedirect(event, "/holdings?google=connected");
  } catch {
    await session.clear();
    return sendRedirect(event, "/holdings?google=failed");
  }
});
