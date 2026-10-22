/**
 * Cryptographic Service
 * AES-256-GCM Encryption & SHA-256 Hashing for sensitive offline documents & backups
 * Works seamlessly in Browser, Android WebView, Electron, and Node.js
 */

const SALT_LENGTH = 16;
const IV_LENGTH = 12; // 96 bits recommended for AES-GCM
const PBKDF2_ITERATIONS = 100000;

export interface EncryptedPayload {
  ciphertext: string; // Base64
  iv: string;         // Base64
  salt: string;       // Base64
}

function getSubtleCrypto(): SubtleCrypto {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
    return window.crypto.subtle;
  }
  if (typeof globalThis !== 'undefined' && globalThis.crypto && globalThis.crypto.subtle) {
    return globalThis.crypto.subtle;
  }
  throw new Error('Web Crypto API (crypto.subtle) is not available in this environment.');
}

function getRandomValues(array: Uint8Array): Uint8Array {
  if (typeof window !== 'undefined' && window.crypto) {
    return window.crypto.getRandomValues(array);
  }
  if (typeof globalThis !== 'undefined' && globalThis.crypto) {
    return globalThis.crypto.getRandomValues(array);
  }
  for (let i = 0; i < array.length; i++) {
    array[i] = Math.floor(Math.random() * 256);
  }
  return array;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Derives a 256-bit AES-GCM key from a passphrase/passkey using PBKDF2
 */
async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const subtle = getSubtleCrypto();
  const enc = new TextEncoder();
  const keyMaterial = await subtle.importKey(
    'raw',
    enc.encode(passphrase),
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  );

  return subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as any,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypts plaintext string using AES-256-GCM
 */
export async function encryptData(plaintext: string, secretKey: string = 'tax_crm_local_master_key'): Promise<EncryptedPayload> {
  const subtle = getSubtleCrypto();
  const enc = new TextEncoder();
  const salt = getRandomValues(new Uint8Array(SALT_LENGTH));
  const iv = getRandomValues(new Uint8Array(IV_LENGTH));

  const key = await deriveKey(secretKey, salt);
  const encodedPlaintext = enc.encode(plaintext);

  const ciphertextBuffer = await subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv as any
    },
    key,
    encodedPlaintext
  );

  return {
    ciphertext: arrayBufferToBase64(ciphertextBuffer),
    iv: arrayBufferToBase64(iv.buffer as ArrayBuffer),
    salt: arrayBufferToBase64(salt.buffer as ArrayBuffer)
  };
}

/**
 * Decrypts AES-256-GCM encrypted payload back to plaintext
 */
export async function decryptData(payload: EncryptedPayload, secretKey: string = 'tax_crm_local_master_key'): Promise<string> {
  const subtle = getSubtleCrypto();
  const dec = new TextDecoder();

  const saltBuffer = base64ToArrayBuffer(payload.salt);
  const ivBuffer = base64ToArrayBuffer(payload.iv);
  const ciphertextBuffer = base64ToArrayBuffer(payload.ciphertext);

  const key = await deriveKey(secretKey, new Uint8Array(saltBuffer));

  const decryptedBuffer = await subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: new Uint8Array(ivBuffer) as any
    },
    key,
    ciphertextBuffer
  );

  return dec.decode(decryptedBuffer);
}

/**
 * Computes a SHA-256 hash of a string (useful for backup integrity validation & PIN hashing)
 */
export async function computeSha256(data: string): Promise<string> {
  const subtle = getSubtleCrypto();
  const enc = new TextEncoder();
  const buffer = enc.encode(data);
  const hashBuffer = await subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}
