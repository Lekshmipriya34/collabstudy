import CryptoJS from 'crypto-js';

// Encrypt before saving to Firestore
export function encrypt(message, roomCode) {
  if (!message || !roomCode) return "";
  return CryptoJS.AES.encrypt(message, roomCode).toString();
}

// Decrypt immediately upon fetching from Firestore
export function decrypt(cipherText, roomCode) {
  if (!cipherText || !roomCode) return "";
  try {
    const bytes = CryptoJS.AES.decrypt(cipherText, roomCode);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    // If decryption fails (e.g. wrong key), it returns an empty string
    return decrypted || '[encrypted message]';
  } catch {
    return '[encrypted message]'; 
  }
}