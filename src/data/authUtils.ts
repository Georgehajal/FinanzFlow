// Biometrische Authentifizierung (Face ID / Touch ID / PIN)
import * as LocalAuthentication from 'expo-local-authentication';

export async function isBiometryAvailable(): Promise<boolean> {
  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  if (!hasHardware) return false;
  const enrolled = await LocalAuthentication.isEnrolledAsync();
  return enrolled;
}

export async function authenticate(reason: string = 'Finanzflow entsperren'): Promise<boolean> {
  const ok = await isBiometryAvailable();
  if (!ok) return true; // wenn keine Biometrie eingerichtet, kein Lock
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: reason,
    cancelLabel: 'Abbrechen',
    fallbackLabel: 'PIN eingeben',
    disableDeviceFallback: false,
  });
  return result.success;
}

export async function supportedTypeLabel(): Promise<string> {
  const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
  if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) return 'Face ID';
  if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) return 'Touch ID / Fingerabdruck';
  if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) return 'Iris-Scan';
  return 'PIN / Code';
}
