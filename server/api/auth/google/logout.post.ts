import { googleSession, requireGoogleOrigin } from "../../../utils/googleSession.ts";

export default defineEventHandler(async event => {
  requireGoogleOrigin(event);
  await (await googleSession(event)).clear();
  return { ok: true };
});
