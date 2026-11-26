import { googleConfig, googleSession, requireGoogleOrigin, googleDigest } from "../../../utils/googleSession.ts";

export default defineEventHandler(async event => {
  requireGoogleOrigin(event);
  const config = googleConfig(event);
  const session = await googleSession(event);
  await session.clear();
  const state = crypto.randomUUID();
  const verifier = Array.from(crypto.getRandomValues(new Uint8Array(32)), byte => byte.toString(16).padStart(2, "0")).join("");
  await session.update({ state, verifier, startedAt: Date.now() });
  const query = new URLSearchParams({
    client_id: config.googleClientId,
    redirect_uri: config.googleRedirectUri,
    response_type: "code",
    scope: "openid email https://www.googleapis.com/auth/spreadsheets.readonly",
    state,
    code_challenge: await googleDigest(verifier),
    code_challenge_method: "S256",
    access_type: "online",
    prompt: "select_account",
  });
  return { url: `https://accounts.google.com/o/oauth2/v2/auth?${query}` };
});
