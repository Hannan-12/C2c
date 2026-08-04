import { randomBytes, scrypt, timingSafeEqual } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);
const KEY_LENGTH = 64;

/**
 * Password hashing. Node runtime only — never import this from middleware,
 * which runs on Edge and has no `node:crypto`.
 *
 * scrypt rather than an argon2 binding: it's in Node's standard library, so
 * there's no native module to compile — which matters on managed shared
 * hosting where build toolchains are limited (docs Section 6).
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derived = (await scryptAsync(password, salt, KEY_LENGTH)) as Buffer;
  return `${salt}:${derived.toString("hex")}`;
}

export async function verifyPassword(
  password: string,
  stored: string,
): Promise<boolean> {
  const [salt, key] = stored.split(":");
  if (!salt || !key) return false;

  const derived = (await scryptAsync(password, salt, KEY_LENGTH)) as Buffer;
  const expected = Buffer.from(key, "hex");

  // Lengths must match before timingSafeEqual, which throws otherwise.
  if (expected.length !== derived.length) return false;
  return timingSafeEqual(expected, derived);
}
