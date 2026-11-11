/**
 * Client-Side PIN & WebAuthn Biometric Lock Utility
 * Secures IndexedDB local records with zero cloud dependency
 */

export async function hashPin(pin: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin + '_sawaari_salt_np');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function verifyPin(enteredPin: string, storedHash: string): Promise<boolean> {
  const enteredHash = await hashPin(enteredPin);
  return enteredHash === storedHash;
}

export function isBiometricAvailable(): boolean {
  return typeof window !== 'undefined' &&
    window.PublicKeyCredential !== undefined &&
    typeof window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function';
}

export async function authenticateWithBiometrics(): Promise<boolean> {
  if (!isBiometricAvailable()) {
    return false;
  }
  try {
    const isAvailable = await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    if (!isAvailable) return false;

    // Challenge for local verification
    const challenge = new Uint8Array(32);
    crypto.getRandomValues(challenge);

    const credential = await navigator.credentials.get({
      publicKey: {
        challenge,
        timeout: 60000,
        userVerification: 'preferred'
      }
    });

    return !!credential;
  } catch (err: any) {
    // If not configured or cancelled, return false so user can type PIN
    console.warn('Biometric auth info/cancel:', err);
    return false;
  }
}
