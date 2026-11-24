import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCustomerAuth } from '@/hooks/useCustomerAuth';

export type IdentityReviewStatus = 'pending' | 'approved' | 'rejected';

export interface CustomerIdentityRecord {
  status: IdentityReviewStatus;
  legal_name: string;
  national_id: string;
  review_notes: string | null;
  submitted_at: string | null;
  reviewed_at: string | null;
}

export interface DriverApplicationRecord {
  status: IdentityReviewStatus;
  review_notes: string | null;
  legal_name: string;
  national_id: string;
  whatsapp: string;
  email: string;
  address: string;
  sim_type: string;
  sim_number: string;
  sim_expiry: string;
  vehicle_type: string;
  vehicle_make: string;
  vehicle_model: string;
  vehicle_year: number;
  vehicle_plate: string;
  stnk_number: string;
  stnk_expiry: string;
  skck_number: string;
  skck_expiry: string;
  submitted_at: string | null;
  reviewed_at: string | null;
}

interface IdentitySnapshot {
  customer_identity: CustomerIdentityRecord | null;
  driver_application: DriverApplicationRecord | null;
}

export function useCustomerIdentity() {
  const { customer } = useCustomerAuth();
  const [snapshot, setSnapshot] = useState<IdentitySnapshot>({
    customer_identity: null,
    driver_application: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!customer?.id) {
      setSnapshot({ customer_identity: null, driver_application: null });
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const { data, error: functionError } = await supabase.functions.invoke('identity-verification', {
        body: { action: 'customer_status' },
      });
      if (functionError) throw new Error(functionError.message || 'Status verifikasi tidak dapat dimuat.');
      if (!data?.success) throw new Error(data?.error || 'Status verifikasi tidak dapat dimuat.');
      setSnapshot({
        customer_identity: data.customer_identity || null,
        driver_application: data.driver_application || null,
      });
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Status verifikasi tidak dapat dimuat.');
    } finally {
      setLoading(false);
    }
  }, [customer?.id]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    ...snapshot,
    loading,
    error,
    isFullService: snapshot.customer_identity?.status === 'approved',
    refresh,
  };
}