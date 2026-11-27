export const DRIVER_DOCUMENT_KEYS = ['ktp', 'selfie', 'sim', 'stnk', 'vehicle', 'skck'] as const;
export type DriverDocumentKey = typeof DRIVER_DOCUMENT_KEYS[number];

export function isValidNationalId(value: unknown): value is string {
  return typeof value === 'string' && /^\d{16}$/.test(value);
}

export function requiresFullServiceForPointOrder(orderType: unknown, pointsUsed: unknown): boolean {
  return ['food', 'product'].includes(String(orderType))
    && typeof pointsUsed === 'number'
    && Number.isFinite(pointsUsed)
    && pointsUsed > 0;
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
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(today);
  const dateParts = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const jakartaToday = `${dateParts.year}-${dateParts.month}-${dateParts.day}`;
  return value >= jakartaToday;
}

export function expectedDriverDocumentPath(customerId: string, key: DriverDocumentKey): string {
  return `driver-applications/${customerId}/${key}-`;
}

export function expectedCustomerKtpPath(customerId: string): string {
  return `customer-kyc/${customerId}/ktp-`;
}

function hasVersionedFile(prefix: string, path: unknown): path is string {
  if (typeof path !== 'string' || !path.startsWith(prefix)) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|png|webp|pdf)$/i.test(path.slice(prefix.length));
}

export function isExpectedCustomerKtpPath(customerId: string, path: unknown): path is string {
  return hasVersionedFile(expectedCustomerKtpPath(customerId), path);
}

export function isExpectedDriverDocumentPath(customerId: string, key: DriverDocumentKey, path: unknown): path is string {
  return hasVersionedFile(expectedDriverDocumentPath(customerId, key), path);
}