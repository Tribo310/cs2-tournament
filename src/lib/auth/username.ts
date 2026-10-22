// Admin usernames: 2–32 Latin letters, digits, ".", "_" or "-". Case-insensitive (stored lowercased).
export const USERNAME_PATTERN = /^[a-z0-9._-]{2,32}$/;

export function normalizeUsername(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

export function isValidUsername(value: string): boolean {
  return USERNAME_PATTERN.test(value);
}
