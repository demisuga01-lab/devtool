export type EncryptedPayload = {
  encrypted_content: string;
  iv: string;
  key: string;
};

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function asArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.slice().buffer as ArrayBuffer;
}

export function bytesToBase64Url(bytes: Uint8Array): string {
  return bytesToBase64(bytes).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export function base64UrlToBytes(value: string): Uint8Array {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=");
  return base64ToBytes(padded);
}

export async function encryptBytes(bytes: Uint8Array): Promise<EncryptedPayload> {
  const key = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv: asArrayBuffer(iv) }, key, asArrayBuffer(bytes));
  const rawKey = new Uint8Array(await crypto.subtle.exportKey("raw", key));
  return {
    encrypted_content: bytesToBase64(new Uint8Array(encrypted)),
    iv: bytesToBase64(iv),
    key: bytesToBase64Url(rawKey),
  };
}

export async function decryptBytes(encryptedContent: string, iv: string, keyValue: string): Promise<Uint8Array> {
  const keyBytes = base64UrlToBytes(keyValue);
  const key = await crypto.subtle.importKey("raw", asArrayBuffer(keyBytes), "AES-GCM", false, ["decrypt"]);
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: asArrayBuffer(base64ToBytes(iv)) },
    key,
    asArrayBuffer(base64ToBytes(encryptedContent)),
  );
  return new Uint8Array(decrypted);
}

export async function encryptText(value: string): Promise<EncryptedPayload> {
  return encryptBytes(textEncoder.encode(value));
}

export async function decryptText(encryptedContent: string, iv: string, keyValue: string): Promise<string> {
  return textDecoder.decode(await decryptBytes(encryptedContent, iv, keyValue));
}
