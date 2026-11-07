// Teacher password. Shared by vite.config.ts (hashes it at build time) and the app (checks input),
// so the password itself is never shipped in the JavaScript bundle.

/** Default password if VITE_TEACHER_PIN is not set when building. */
export const DEFAULT_TEACHER_PIN = 'thayqui2026'

/** Case-, accent- and space-insensitive: "Thầy Quí 2026" = "thayqui2026". */
export function normalizePin(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/\s+/g, '')
}

/** cyrb53 — small, fast string hash (works on plain http too, unlike crypto.subtle). */
export function hashPin(pin: string): string {
  const str = normalizePin(pin)
  let h1 = 0xdeadbeef ^ 7
  let h2 = 0x41c6ce57 ^ 7
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i)
    h1 = Math.imul(h1 ^ ch, 2654435761)
    h2 = Math.imul(h2 ^ ch, 1597334677)
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909)
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909)
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36)
}
