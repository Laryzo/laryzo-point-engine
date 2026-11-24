import { supabase } from '@/integrations/supabase/client';

export const IDENTITY_DOCUMENT_BUCKET = 'identity-documents';
export const MAX_IDENTITY_FILE_BYTES = 8 * 1024 * 1024;

export type DriverDocumentKey = 'ktp' | 'selfie' | 'sim' | 'stnk' | 'vehicle' | 'skck';
export type IdentityDocumentScope = 'customer-kyc' | 'driver-applications';

const ALLOWED_DOCUMENT_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
]);

export async function uploadIdentityDocument(
  customerId: string,
  scope: IdentityDocumentScope,
  documentKey: DriverDocumentKey,
  file: File,
): Promise<void> {
  if (!ALLOWED_DOCUMENT_TYPES.has(file.type)) {
    throw new Error('Gunakan berkas JPG, PNG, WebP, atau PDF.');
  }
  if (file.size <= 0 || file.size > MAX_IDENTITY_FILE_BYTES) {
    throw new Error('Ukuran setiap berkas maksimal 8 MB.');
  }

  const fileName = scope === 'customer-kyc' ? 'ktp' : documentKey;
  const path = `${scope}/${customerId}/${fileName}`;
  const { error } = await supabase.storage
    .from(IDENTITY_DOCUMENT_BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type });

  if (error) throw new Error(error.message || 'Gagal mengunggah dokumen.');
}