export const DRIVER_DOCUMENT_KEYS = ['ktp', 'selfie', 'sim', 'stnk', 'vehicle', 'skck'] as const;
export type DriverDocumentKey = typeof DRIVER_DOCUMENT_KEYS[number];

export function isValidNationalId(value: unknown): value is string {
  return typeof value === 'string' && /^\d{16}$/.test(value);
}

export function areDriverDocumentsComplete(
  paths: Partial<Record<DriverDocumentKey, unknown>>,
): boolean {
  return DRIVER_DOCUMENT_KEYS.every((key) => typeof paths[key] === 'string' && (paths[key] as string).length > 0);
}

export function isCurrentDocumentDate(value: unknown, today = new Date()): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) return false;
  const todayDate = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  return parsed.getTime() >= todayDate.getTime();
}

export function expectedDriverDocumentPath(customerId: string, key: DriverDocumentKey): string {
  return `driver-applications/${customerId}/${key}`;
}

export function expectedCustomerKtpPath(customerId: string): string {
  return `customer-kyc/${customerId}/ktp`;
}