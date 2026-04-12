import { STORAGE_KEYS } from "./storageKeys";
import { getStorageItem, setStorageItem } from "./storageAdapter";

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

const toBase64 = (bytes: Uint8Array): string => {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
};

const fromBase64 = (value: string): Uint8Array => {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
};

const toBase64FromBuffer = (buffer: ArrayBuffer): string => toBase64(new Uint8Array(buffer));

const toBufferFromBase64 = (value: string): ArrayBuffer => fromBase64(value).buffer;

const getOrCreateMasterKeyBytes = async (): Promise<Uint8Array> => {
  const existing = await getStorageItem<string>(STORAGE_KEYS.encryptionKey);
  if (existing) {
    return fromBase64(existing);
  }

  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  await setStorageItem(STORAGE_KEYS.encryptionKey, toBase64(bytes));
  return bytes;
};

const deriveKey = async (salt: Uint8Array): Promise<CryptoKey> => {
  const masterKeyBytes = await getOrCreateMasterKeyBytes();
  const baseKey = await crypto.subtle.importKey("raw", masterKeyBytes, "PBKDF2", false, [
    "deriveKey",
  ]);

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations: 150_000,
      hash: "SHA-256",
    },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
};

export const encryptString = async (plainText: string) => {
  const iv = new Uint8Array(12);
  const salt = new Uint8Array(16);
  crypto.getRandomValues(iv);
  crypto.getRandomValues(salt);

  const key = await deriveKey(salt);
  const cipherBuffer = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    textEncoder.encode(plainText)
  );

  return {
    version: 1,
    cipherText: toBase64FromBuffer(cipherBuffer),
    iv: toBase64(iv),
    salt: toBase64(salt),
  };
};

export const decryptString = async (payload: {
  version: number;
  cipherText: string;
  iv: string;
  salt: string;
}) => {
  if (payload.version !== 1) {
    throw new Error(`Unsupported encrypted payload version: ${payload.version}`);
  }

  const iv = fromBase64(payload.iv);
  const salt = fromBase64(payload.salt);
  const key = await deriveKey(salt);
  const plainBuffer = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    toBufferFromBase64(payload.cipherText)
  );

  return textDecoder.decode(plainBuffer);
};
