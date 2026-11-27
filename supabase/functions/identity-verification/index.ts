import { requireCustomer, requireSuperAdmin, getAuthUser, serviceClient } from '../_shared/auth.ts';
import {
  areDriverDocumentsComplete,
  DRIVER_DOCUMENT_KEYS,
  expectedCustomerKtpPath,
  isCurrentDocumentDate,
  isExpectedCustomerKtpPath,
  isExpectedDriverDocumentPath,
  isValidNationalId,
} from '../_shared/identity-validation.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};
const BUCKET = 'identity-documents';

function reply(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function text(value: unknown, maxLength: number): string {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

async function fileExists(client: ReturnType<typeof serviceClient>, path: string): Promise<boolean> {
  const { data, error } = await client.storage.from(BUCKET).createSignedUrl(path, 30);
  return !error && Boolean(data?.signedUrl);
}

async function signDocuments(
  client: ReturnType<typeof serviceClient>,
  entries: Record<string, string | null>,
): Promise<Record<string, string | null>> {
  const result: Record<string, string | null> = {};
  await Promise.all(Object.entries(entries).map(async ([label, path]) => {
    if (!path) {
      result[label] = null;
      return;
    }
    const { data, error } = await client.storage.from(BUCKET).createSignedUrl(path, 600);
    result[label] = error ? null : data?.signedUrl || null;
  }));
  return result;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return reply({ error: 'Method not allowed' }, 405);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return reply({ error: 'Permintaan tidak valid.' }, 400);
  }

  const client = serviceClient();
  const action = text(body.action, 40);

  try {
    if (action === 'customer_status') {
      const caller = await requireCustomer(req);
      if (!caller) return reply({ error: 'Silakan masuk ke akun customer.' }, 401);

      const [{ data: customerIdentity, error: customerError }, { data: driverApplication, error: driverError }] = await Promise.all([
        client.from('customer_identity_verifications')
          .select('status, legal_name, national_id, review_notes, submitted_at, reviewed_at')
          .eq('customer_id', caller.customer_id).maybeSingle(),
        client.from('driver_applications')
          .select('status, review_notes, legal_name, national_id, whatsapp, email, address, sim_type, sim_number, sim_expiry, vehicle_type, vehicle_make, vehicle_model, vehicle_year, vehicle_plate, stnk_number, stnk_expiry, skck_number, skck_expiry, submitted_at, reviewed_at')
          .eq('customer_id', caller.customer_id).maybeSingle(),
      ]);
      if (customerError || driverError) return reply({ error: 'Status verifikasi belum dapat dimuat.' }, 500);
      return reply({ success: true, customer_identity: customerIdentity || null, driver_application: driverApplication || null });
    }

    if (action === 'submit_customer') {
      const caller = await requireCustomer(req);
      if (!caller) return reply({ error: 'Silakan masuk ke akun customer.' }, 401);
      const legalName = text(body.legal_name, 120);
      const nationalId = text(body.national_id, 16);
      if (legalName.length < 3 || !isValidNationalId(nationalId)) {
        return reply({ error: 'Nama sesuai KTP dan NIK 16 angka wajib diisi.' }, 400);
      }

      const { data: existing } = await client.from('customer_identity_verifications')
        .select('status').eq('customer_id', caller.customer_id).maybeSingle();
      if (existing?.status === 'approved') return reply({ error: 'Verifikasi akun ini sudah disetujui.' }, 409);
      if (existing?.status === 'pending') return reply({ error: 'Pengajuan KTP sedang diperiksa.' }, 409);

      const ktpPath = text(body.ktp_path, 300);
      if (!isExpectedCustomerKtpPath(caller.customer_id, ktpPath)) {
        return reply({ error: 'Unggah ulang foto KTP dari formulir ini.' }, 400);
      }
      if (!await fileExists(client, ktpPath)) return reply({ error: 'Unggah foto KTP sebelum mengirim pengajuan.' }, 400);
      const { error } = await client.from('customer_identity_verifications').upsert({
        customer_id: caller.customer_id,
        legal_name: legalName,
        national_id: nationalId,
        ktp_path: ktpPath,
        status: 'pending',
        review_notes: null,
        reviewed_by: null,
        reviewed_at: null,
        submitted_at: new Date().toISOString(),
      }, { onConflict: 'customer_id' });
      if (error) return reply({ error: 'Pengajuan KTP belum dapat disimpan.' }, 500);
      return reply({ success: true });
    }

    if (action === 'submit_driver') {
      const caller = await requireCustomer(req);
      if (!caller) return reply({ error: 'Silakan masuk ke akun customer.' }, 401);
      const { data: existing } = await client.from('driver_applications')
        .select('status').eq('customer_id', caller.customer_id).maybeSingle();
      if (existing?.status === 'approved') return reply({ error: 'Pendaftaran driver ini sudah disetujui.' }, 409);
      if (existing?.status === 'pending') return reply({ error: 'Pendaftaran driver sedang diperiksa.' }, 409);

      const legalName = text(body.legal_name, 120);
      const nationalId = text(body.national_id, 16);
      const whatsapp = text(body.whatsapp, 30);
      const email = text(body.email, 255).toLowerCase();
      const address = text(body.address, 500);
      const simType = text(body.sim_type, 10);
      const simNumber = text(body.sim_number, 40);
      const simExpiry = text(body.sim_expiry, 10);
      const vehicleType = text(body.vehicle_type, 20);
      const vehicleMake = text(body.vehicle_make, 80);
      const vehicleModel = text(body.vehicle_model, 80);
      const vehicleYear = Number(body.vehicle_year);
      const vehiclePlate = text(body.vehicle_plate, 20).toUpperCase();
      const stnkNumber = text(body.stnk_number, 40);
      const stnkExpiry = text(body.stnk_expiry, 10);
      const skckNumber = text(body.skck_number, 60);
      const skckExpiry = text(body.skck_expiry, 10);

      const requiredText = [legalName, whatsapp, address, simNumber, vehicleMake, vehicleModel, vehiclePlate, stnkNumber, skckNumber];
      if (requiredText.some((value) => value.length < 2) || !isValidNationalId(nationalId)) {
        return reply({ error: 'Lengkapi seluruh data identitas dan kendaraan.' }, 400);
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !/^\+?[0-9 ()-]{8,30}$/.test(whatsapp)) {
        return reply({ error: 'Email atau nomor WhatsApp belum valid.' }, 400);
      }
      if (!['Motor', 'Mobil'].includes(vehicleType) || (vehicleType === 'Motor' && simType !== 'SIM C') || (vehicleType === 'Mobil' && simType !== 'SIM A')) {
        return reply({ error: 'Jenis SIM harus sesuai dengan kendaraan.' }, 400);
      }
      if (!Number.isInteger(vehicleYear) || vehicleYear < 1980 || vehicleYear > new Date().getFullYear() + 1) {
        return reply({ error: 'Tahun kendaraan belum valid.' }, 400);
      }
      if (![simExpiry, stnkExpiry, skckExpiry].every((date) => isCurrentDocumentDate(date))) {
        return reply({ error: 'SIM, STNK, dan SKCK harus masih berlaku.' }, 400);
      }
      if (body.agree_to_accuracy !== true) return reply({ error: 'Persetujuan kebenaran data wajib diberikan.' }, 400);

      const requestedPaths = body.document_paths && typeof body.document_paths === 'object'
        ? body.document_paths as Record<string, unknown>
        : {};
      const paths = Object.fromEntries(DRIVER_DOCUMENT_KEYS.map((key) => [key, text(requestedPaths[key], 300)])) as Record<typeof DRIVER_DOCUMENT_KEYS[number], string>;
      if (!areDriverDocumentsComplete(paths)) return reply({ error: 'Seluruh dokumen driver wajib dilampirkan.' }, 400);
      if (DRIVER_DOCUMENT_KEYS.some((key) => !isExpectedDriverDocumentPath(caller.customer_id, key, paths[key]))) {
        return reply({ error: 'Unggah ulang seluruh dokumen melalui formulir ini.' }, 400);
      }
      const exists = await Promise.all(Object.values(paths).map((path) => fileExists(client, path)));
      if (exists.some((present) => !present)) return reply({ error: 'Unggah KTP, foto diri, SIM, STNK, kendaraan, dan SKCK sebelum mengirim.' }, 400);

      const { error } = await client.from('driver_applications').upsert({
        customer_id: caller.customer_id,
        legal_name: legalName,
        national_id: nationalId,
        whatsapp,
        email,
        address,
        ktp_path: paths.ktp,
        selfie_path: paths.selfie,
        sim_type: simType,
        sim_number: simNumber,
        sim_expiry: simExpiry,
        sim_path: paths.sim,
        vehicle_type: vehicleType,
        vehicle_make: vehicleMake,
        vehicle_model: vehicleModel,
        vehicle_year: vehicleYear,
        vehicle_plate: vehiclePlate,
        stnk_number: stnkNumber,
        stnk_expiry: stnkExpiry,
        stnk_path: paths.stnk,
        vehicle_photo_path: paths.vehicle,
        skck_number: skckNumber,
        skck_expiry: skckExpiry,
        skck_path: paths.skck,
        status: 'pending',
        review_notes: null,
        reviewed_by: null,
        reviewed_at: null,
        submitted_at: new Date().toISOString(),
      }, { onConflict: 'customer_id' });
      if (error) return reply({ error: 'Pendaftaran driver belum dapat disimpan.' }, 500);
      return reply({ success: true });
    }

    if (action === 'admin_list_pending') {
      const admin = await requireSuperAdmin(req);
      if (!admin) return reply({ error: 'Akses pemeriksaan identitas hanya untuk Super Admin.' }, 403);

      const [{ data: customerRows, error: customerError }, { data: driverRows, error: driverError }] = await Promise.all([
        client.from('customer_identity_verifications')
          .select('id, customer_id, legal_name, national_id, status, submitted_at, ktp_path')
          .eq('status', 'pending').order('submitted_at', { ascending: true }).limit(100),
        client.from('driver_applications')
          .select('id, customer_id, legal_name, national_id, whatsapp, email, address, sim_type, sim_number, sim_expiry, vehicle_type, vehicle_make, vehicle_model, vehicle_year, vehicle_plate, stnk_number, stnk_expiry, skck_number, skck_expiry, submitted_at, ktp_path, selfie_path, sim_path, stnk_path, vehicle_photo_path, skck_path')
          .eq('status', 'pending').order('submitted_at', { ascending: true }).limit(100),
      ]);
      if (customerError || driverError) return reply({ error: 'Antrean verifikasi belum dapat dimuat.' }, 500);

      const customerSubmissions = await Promise.all((customerRows || []).map(async (row) => ({
        id: row.id,
        customer_id: row.customer_id,
        legal_name: row.legal_name,
        national_id: row.national_id,
        status: row.status,
        submitted_at: row.submitted_at,
        documents: await signDocuments(client, { KTP: row.ktp_path }),
      })));
      const driverApplications = await Promise.all((driverRows || []).map(async (row) => ({
        id: row.id,
        customer_id: row.customer_id,
        legal_name: row.legal_name,
        national_id: row.national_id,
        whatsapp: row.whatsapp,
        email: row.email,
        address: row.address,
        sim_type: row.sim_type,
        sim_number: row.sim_number,
        sim_expiry: row.sim_expiry,
        vehicle_type: row.vehicle_type,
        vehicle_make: row.vehicle_make,
        vehicle_model: row.vehicle_model,
        vehicle_year: row.vehicle_year,
        vehicle_plate: row.vehicle_plate,
        stnk_number: row.stnk_number,
        stnk_expiry: row.stnk_expiry,
        skck_number: row.skck_number,
        skck_expiry: row.skck_expiry,
        submitted_at: row.submitted_at,
        documents: await signDocuments(client, {
          KTP: row.ktp_path,
          'Foto diri': row.selfie_path,
          SIM: row.sim_path,
          STNK: row.stnk_path,
          Kendaraan: row.vehicle_photo_path,
          SKCK: row.skck_path,
        }),
      })));
      return reply({ success: true, customer_submissions: customerSubmissions, driver_applications: driverApplications });
    }

    if (action === 'admin_review') {
      const admin = await requireSuperAdmin(req);
      if (!admin) return reply({ error: 'Akses pemeriksaan identitas hanya untuk Super Admin.' }, 403);
      const authUser = await getAuthUser(req);
      if (!authUser?.id) return reply({ error: 'Sesi Super Admin tidak valid.' }, 401);
      const recordType = text(body.record_type, 20);
      const recordId = text(body.record_id, 64);
      const status = text(body.status, 20);
      const reviewNotes = text(body.review_notes, 500);
      if (!/^[0-9a-f-]{36}$/i.test(recordId) || !['customer', 'driver'].includes(recordType) || !['approved', 'rejected'].includes(status)) {
        return reply({ error: 'Keputusan pemeriksaan tidak valid.' }, 400);
      }
      if (status === 'rejected' && reviewNotes.length < 5) return reply({ error: 'Catatan penolakan wajib diisi.' }, 400);

      const table = recordType === 'customer' ? 'customer_identity_verifications' : 'driver_applications';
      const { data, error } = await client.from(table)
        .update({
          status,
          review_notes: status === 'rejected' ? reviewNotes : null,
          reviewed_by: authUser.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', recordId).eq('status', 'pending').select('id').maybeSingle();
      if (error) return reply({ error: 'Keputusan pemeriksaan belum dapat disimpan.' }, 500);
      if (!data) return reply({ error: 'Berkas tidak ditemukan atau sudah diperiksa.' }, 404);
      return reply({ success: true });
    }

    return reply({ error: 'Permintaan tidak dikenali.' }, 400);
  } catch {
    console.error('Identity verification request failed');
    return reply({ error: 'Layanan verifikasi sedang bermasalah. Silakan coba lagi.' }, 500);
  }
});