import { googleSession } from "../../../utils/googleSession.ts";

export default defineEventHandler(async event => {
  setHeader(event, "Cache-Control", "no-store");
  const config = useRuntimeConfig(event);
  if (!config.googleClientId || !config.googleClientSecret) return { configured: false, account: null };
  const session = await googleSession(event, false);
  const { accountId, email, expiresAt, accessToken } = session.data;
  return { configured: true, account: accountId && accessToken && expiresAt && expiresAt > Date.now()
    ? { id: accountId, email: email!, expiresAt } : null };
});
