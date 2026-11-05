import { randomInt } from "node:crypto";
import bcrypt from "bcryptjs";

const PASSWORD_LENGTH = 10;
const CODE_LENGTH = 12;
// No 0/o, 1/l/i: these get read aloud and typed on phones.
const ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";
const BCRYPT_ROUNDS = 12;

export const MIN_PASSWORD_LENGTH = 8;

function randomString(length: number): string {
  let value = "";
  for (let i = 0; i < length; i++) {
    value += ALPHABET[randomInt(ALPHABET.length)];
  }
  return value;
}

export const generatePassword = (): string => randomString(PASSWORD_LENGTH);

/** An organization's internal ID: unguessable, and fine to read out loud. */
export const generateOrgCode = (): string => randomString(CODE_LENGTH);

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export function checkPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
