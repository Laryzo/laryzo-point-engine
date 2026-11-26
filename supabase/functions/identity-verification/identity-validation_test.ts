import {
  areDriverDocumentsComplete,
  expectedCustomerKtpPath,
  expectedDriverDocumentPath,
  isCurrentDocumentDate,
  isValidNationalId,
} from '../_shared/identity-validation.ts';

Deno.test('NIK requires exactly 16 digits', () => {
  if (!isValidNationalId('3173010101900001')) throw new Error('16-digit NIK should be accepted');
  if (isValidNationalId('317301010190001')) throw new Error('15-digit NIK must be rejected');
  if (isValidNationalId('317301010190000A')) throw new Error('NIK with letters must be rejected');
});

Deno.test('driver application requires every document including SKCK', () => {
  const documents = { ktp: 'ktp', selfie: 'selfie', sim: 'sim', stnk: 'stnk', vehicle: 'vehicle', skck: 'skck' };
  if (!areDriverDocumentsComplete(documents)) throw new Error('complete driver documents should be accepted');
  if (areDriverDocumentsComplete({ ...documents, skck: '' })) throw new Error('missing SKCK must be rejected');
});

Deno.test('driver application document expiries must not be past dates', () => {
  const today = new Date('2026-11-24T12:00:00.000Z');
  if (!isCurrentDocumentDate('2026-11-24', today)) throw new Error('today remains valid through the day');
  if (!isCurrentDocumentDate('2027-01-01', today)) throw new Error('future expiry should be accepted');
  if (isCurrentDocumentDate('2026-11-23', today)) throw new Error('expired document must be rejected');
});

Deno.test('identity documents are scoped to the signed-in customer folder', () => {
  if (expectedCustomerKtpPath('customer-1') !== 'customer-kyc/customer-1/ktp') throw new Error('customer KTP path mismatch');
  if (expectedDriverDocumentPath('customer-1', 'skck') !== 'driver-applications/customer-1/skck') throw new Error('SKCK path mismatch');
});