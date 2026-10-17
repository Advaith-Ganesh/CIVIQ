import { z } from "zod";
export const reportSchema = z.object({
  description: z.string().trim().min(12).max(2000),
  location: z.string().trim().min(3).max(160),
  lat: z.number().min(50.85).max(50.97),
  lng: z.number().min(-1.5).max(-1.3),
  categoryId: z.string().min(1),
  photoId: z.string().min(1),
  confirmIssueId: z.string().optional(),
  accessibility: z
    .array(
      z.enum([
        "blockedPavement",
        "wheelchairObstruction",
        "unsafeCrossing",
        "tactileObstruction",
        "restrictedAccess",
      ]),
    )
    .max(5)
    .default([]),
});
export function imageSignature(b: Uint8Array) {
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b[0] === 137 && b[1] === 80 && b[2] === 78 && b[3] === 71)
    return "image/png";
  if (
    String.fromCharCode(...b.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...b.slice(8, 12)) === "WEBP"
  )
    return "image/webp";
  return null;
}
export function validateImage(b: Uint8Array, mime: string) {
  if (b.length > 5 * 1024 * 1024 || b.length < 16)
    throw new Error("Photographs must be between 16 bytes and 5 MB.");
  const actual = imageSignature(b);
  if (!actual || actual !== mime)
    throw new Error("Upload a genuine JPEG, PNG or WebP photograph.");
  return actual;
}
