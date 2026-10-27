// Shared password check. Set APP_PASSWORD in Vercel to require it; leave unset to allow anyone.
export function needsPassword() {
  return !!process.env.APP_PASSWORD;
}
export function authorised(req) {
  const want = process.env.APP_PASSWORD;
  if (!want) return true;
  const got = req.headers["x-app-password"] || "";
  if (got.length !== want.length) return false;
  let diff = 0;
  for (let i = 0; i < want.length; i++) diff |= want.charCodeAt(i) ^ got.charCodeAt(i);
  return diff === 0;
}
