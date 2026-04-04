import { customAlphabet } from 'nanoid';

const ALPHABET = '1234567890abcdefghijklmnopqrstuvwxyz';
const generateId = customAlphabet(ALPHABET, 22);

export function generateDeviceId(): string {
  return `d${generateId()}`;
}

export function generateSessionId(): string {
  return `s${generateId()}`;
}

export function generateItemId(): string {
  return `i${generateId()}`;
}

export function generateChunkId(): string {
  return `c${generateId()}`;
}

export function generateUserId(): string {
  return `u${generateId()}`;
}
