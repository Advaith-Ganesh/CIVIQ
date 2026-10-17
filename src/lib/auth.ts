import { timingSafeEqual } from "node:crypto";
export function localDemo() {
  return (
    process.env.LOCAL_DEMO === "true" && process.env.NODE_ENV !== "production"
  );
}
export function isStaff(request: Request) {
  if (localDemo()) return true;
  const token =
    request.headers.get("authorization")?.replace(/^Bearer /, "") || "";
  const expected = process.env.STAFF_TOKEN || "";
  return (
    expected.length >= 24 &&
    token.length === expected.length &&
    timingSafeEqual(Buffer.from(token), Buffer.from(expected))
  );
}
const hits = new Map<string, { count: number; until: number }>();
export function rateLimit(request: Request) {
  const key = request.headers.get("x-forwarded-for")?.split(",")[0] || "local";
  const now = Date.now();
  if (hits.size > 10000)
    for (const [k, v] of hits) if (v.until < now) hits.delete(k);
  const h = hits.get(key);
  if (!h || h.until < now) {
    hits.set(key, { count: 1, until: now + 60000 });
    return true;
  }
  return ++h.count <= 60;
}
