import { createError, getHeader, setHeader, useSession, type H3Event } from "h3";

type GoogleSession = {
  state?: string;
  verifier?: string;
  startedAt?: number;
  accessToken?: string;
  expiresAt?: number;
  accountId?: string;
  email?: string;
};

export function googleConfig(event: H3Event) {
  const config = useRuntimeConfig(event);
  if (!config.googleClientId || !config.googleClientSecret)
    throw createError({ statusCode: 503, statusMessage: "Google OAuth configuration unavailable" });
  return config;
}

export async function googleSession(event: H3Event, writable = true) {
  setHeader(event, "Cache-Control", "no-store");
  setHeader(event, "Referrer-Policy", "no-referrer");
  const config = googleConfig(event);
  return useSession<GoogleSession>(event, {
    name: "portfolio-google",
    // Domain separation keeps the encryption key distinct from the OAuth credential.
    password: await googleDigest(`portfolio-google-session-v1:${config.googleClientSecret}`),
    maxAge: 3600,
    sessionHeader: false,
    cookie: writable ? { httpOnly: true, secure: new URL(config.googleRedirectUri).protocol === "https:", sameSite: "lax", path: "/" } : false,
  });
}

export function requireGoogleOrigin(event: H3Event) {
  const origin = new URL(googleConfig(event).googleRedirectUri).origin;
  if (getHeader(event, "origin") !== origin || getHeader(event, "x-portfolio-request") !== "1")
    throw createError({ statusCode: 403, statusMessage: "Invalid request origin" });
}

export async function requireGoogleSession(event: H3Event) {
  const session = await googleSession(event);
  if (!session.data.accessToken || !session.data.accountId || !session.data.expiresAt || session.data.expiresAt <= Date.now()) {
    await session.clear();
    throw createError({ statusCode: 401, statusMessage: "Google connection expired" });
  }
  return session;
}

export async function googleDigest(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return btoa(String.fromCharCode(...new Uint8Array(digest))).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}
